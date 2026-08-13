import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import TreeView, { flattenTree } from 'react-accessible-treeview';
import { FaFolderPlus, FaFile, FaArrowUp, FaArrowDown, FaRegFolder, FaRegFolderOpen, FaPen, FaTrash, FaPlay, FaPause, FaFolderOpen, FaFolderClosed } from 'react-icons/fa6';
import './Sidebar.css';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { getApiUrl } from '../../api';

// Icons explizit als React-Komponenten typisieren
const FaFolderPlusIcon = FaFolderPlus as React.ComponentType<any>;
const FaFileIcon = FaFile as React.ComponentType<any>;
const FaArrowUpIcon = FaArrowUp as React.ComponentType<any>;
const FaArrowDownIcon = FaArrowDown as React.ComponentType<any>;
const FaRegFolderIcon = FaRegFolder as React.ComponentType<any>;
const FaRegFolderOpenIcon = FaRegFolderOpen as React.ComponentType<any>;
const FaPenIcon = FaPen as React.ComponentType<any>;
const FaTrashIcon = FaTrash as React.ComponentType<any>;
const FaPlayIcon = FaPlay as React.ComponentType<any>;
const FaPauseIcon = FaPause as React.ComponentType<any>;
const FaFolderOpenIcon = FaFolderOpen as React.ComponentType<any>;
const FaFolderClosedIcon = FaFolderClosed as React.ComponentType<any>;

function updateNameInTree(tree: any, id: string, newName: string): any {
  if (!tree || !id) return tree;
  
  // Stelle sicher, dass newName ein String ist
  if (typeof newName !== 'string') newName = '';
  
  if (tree.id === id) {
    return { ...tree, name: newName };
  }
  if (Array.isArray(tree.children)) {
    return { ...tree, children: tree.children.map((child: any) => updateNameInTree(child, id, newName)) };
  }
  return tree;
}

// Hilfsfunktion: Tree flatten, das alle Felder erhält
function flattenTreeWithType(node: any, parent: any = null, level = 1) {
  if (!node || typeof node !== 'object') return [];
  
  const flat: any[] = [];
  const { children, ...rest } = node;
  
  // Stelle sicher, dass name immer ein String ist
  const name = typeof node.name === 'string' ? node.name : '';
  
  flat.push({
    ...rest,
    name, // Immer ein String, nie undefined
    parent: parent ? parent.id : null,
    children: children ? children.map((c: any) => c.id).filter(Boolean) : [],
    level,
    type: node.type || 'unknown',
  });
  if (children && children.length > 0) {
    children.forEach((child: any) => {
      if (child && typeof child === 'object') {
      flat.push(...flattenTreeWithType(child, node, level + 1));
      }
    });
  }
  return flat;
}

// Hilfsfunktion: Zähle Elemente in einem Ordner
function countItemsInFolder(treeObj: any, folderId: string): number {
  if (!treeObj) return 0;
  
  const findFolder = (node: any): any => {
    if (node.id === folderId) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findFolder(child);
        if (found) return found;
      }
    }
    return null;
  };
  
  const folder = findFolder(treeObj);
  if (!folder || !folder.children) return 0;
  
  return folder.children.length;
}



// Patch: Bereinige treeData vor der Übergabe an TreeView
function sanitizeTreeData(data: any[]): any[] {
  return data.map(item => {
    if (typeof item.name !== 'string') {
      console.warn('Unerwartetes Element ohne gültigen Namen:', item);
    }
    return {
      ...item,
      name: typeof item.name === 'string' ? item.name : '',
    };
  });
}

// Drag & Drop Typ
const ITEM_TYPE = 'TREE_NODE';

// Hilfskomponente für Drag & Drop Wrapper
const DraggableTreeNode: React.FC<{
  element: any;
  children: React.ReactNode;
  onDropNode: (dragId: string, dropId: string) => void;
}> = ({ element, children, onDropNode }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { id: element.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => element.id !== 'root',
  }), [element]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    canDrop: (item: any) => element.type === 'folder' && item.id !== element.id,
    drop: (item: any) => {
      if (item.id !== element.id) {
        onDropNode(item.id, element.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  }), [element, onDropNode]);

  return (
    <div
      ref={node => { drag(drop(node)); }}
      style={{
        background: isOver && canDrop ? '#2a4155' : undefined,
        borderRadius: isOver && canDrop ? 4 : undefined,
        opacity: isDragging ? 0.5 : 1
      }}
    >
      {children}
    </div>
  );
};

interface SidebarProps {
  onSelectionChange?: (data: {
    folders: { id: string; name: string }[];
    currentFolderId: string | null;
    currentAutomationName: string | null;
    currentAutomationId: string | null;
    currentAutomationStatus: 'on' | 'off' | undefined;
    moveAutomationToFolder: (folderId: string) => void;
  }) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSelectionChange }) => {
  const [treeObj, setTreeObj] = useState<any>(null);
  // Status-Map: { [id]: 'on' | 'off' }
  const [automationStatus, setAutomationStatus] = useState<{ [id: string]: 'on' | 'off' | undefined }>({});
  const [runningAutomationId, setRunningAutomationId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Geflattenete Tree-Daten für Filterung
  const flattenedData = useMemo(() => {
    if (!treeObj) return [];
    return flattenTree(treeObj);
  }, [treeObj]);

  // Gefilterte Daten basierend auf der offiziellen Implementierung
  const filteredData = useMemo(() => {
    if (!filterText.trim() || !flattenedData.length) {
      return flattenedData;
    }

    const searchTerm = filterText.toLowerCase();
    const filtered: any[] = [];
    
    // Hilfsfunktion: Kinder eines Knotens einschließen
    const includeChildren = (id: string | number) => {
      flattenedData.forEach((item) => {
        if (item.parent === id) {
          if (!filtered.find((x) => x.id === item.id)) {
            filtered.push(item);
          }
          if (item.children && item.children.length) {
            includeChildren(item.id);
          }
        }
      });
    };

    // Filtere alle Knoten
    flattenedData.forEach((item) => {
      if (item.id === "ROOT") return;
      
      if (item.name && item.name.toLowerCase().includes(searchTerm)) {
        if (!filtered.find((x) => x.id === item.id)) {
          filtered.push(item);
        }
        
        if (item.children && item.children.length) {
          includeChildren(item.id);
        }
      }
    });

    // Root-Knoten mit gefilterten Kindern hinzufügen
    if (filtered.length > 0) {
      const rootNode = flattenedData.find(item => item.id === "ROOT");
      if (rootNode) {
        filtered.unshift({
          ...rootNode,
          children: rootNode.children.filter((id) =>
            filtered.find((fitem) => fitem.id === id)
          ),
        });
      }
    }

    return filtered.length > 0 ? filtered : flattenedData;
  }, [filterText, flattenedData]);

  // Rekursive Filterfunktion für die Baumstruktur
  function filterTree(node: any, filterText: string): any | null {
    if (!filterText.trim()) return node;
    const search = filterText.toLowerCase();
    const nameMatches = node.name && node.name.toLowerCase().includes(search);
    let filteredChildren: any[] = [];
    if (node.children) {
      filteredChildren = node.children
        .map((child: any) => filterTree(child, filterText))
        .filter(Boolean);
    }
    if (nameMatches || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  }

  const filteredTreeObj = useMemo(() => {
    if (!filterText.trim()) return treeObj;
    return filterTree(treeObj, filterText) || { name: '', children: [] };
  }, [treeObj, filterText]);

  const treeData = useMemo(() => flattenTreeWithType(filteredTreeObj), [filteredTreeObj]);

  // Tree-Daten beim Start laden
  useEffect(() => {
    fetch(getApiUrl('api/scripts'))
      .then(res => res.json())
      .then(data => {
        if (!data || typeof data !== 'object' || !Array.isArray(data.children)) {
          setTreeObj({ name: '', children: [] });
          // setTreeData([]); // This line was removed as per the edit hint.
        } else {
            setTreeObj(data);
            // setTreeData(flattenTreeWithType(data)); // This line was removed as per the edit hint.
        }
      })
      .catch(() => {
        setTreeObj({ name: '', children: [] });
        // setTreeData([]); // This line was removed as per the edit hint.
      });
  }, []);

  // Status für alle Automatisierungen abfragen
  const fetchAutomationStatus = useCallback((ids: string[]) => {
    ids.forEach(id => {
      fetch(getApiUrl(`api/automations/${id}/status`))
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => {
          setAutomationStatus(prev => ({ ...prev, [id]: data.state }));
        })
        .catch(() => {
          setAutomationStatus(prev => ({ ...prev, [id]: undefined }));
        });
    });
  }, []);

  // IDs aller Automatisierungen extrahieren
  const getAllAutomationIds = (tree: any): string[] => {
    if (!tree) return [];
    let ids: string[] = [];
    if ((tree.type === 'automation' || tree.type === 'script') && tree.id) {
      ids.push(tree.id);
    }
    if (tree.children) {
      tree.children.forEach((child: any) => {
        ids = ids.concat(getAllAutomationIds(child));
      });
    }
    return ids;
  };

  // Status beim Laden der Tree-Daten abfragen
  useEffect(() => {
    if (!treeObj) return;
    const ids = getAllAutomationIds(treeObj);
    if (ids.length > 0) fetchAutomationStatus(ids);
  }, [treeObj, fetchAutomationStatus]);

  // Optional: Polling für Status (z.B. alle 10 Sekunden)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!treeObj) return;
      const ids = getAllAutomationIds(treeObj);
      if (ids.length > 0) fetchAutomationStatus(ids);
    }, 10000);
    return () => clearInterval(interval);
  }, [treeObj, fetchAutomationStatus]);

  // Fokussiere Input-Feld wenn editingId gesetzt wird
  useEffect(() => {
    if (editingId && inputRef.current) {
      // Kurze Verzögerung um sicherzustellen, dass das DOM bereit ist
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 10);
    }
  }, [editingId]);

  // Click-Outside-Handler für Edit-Modus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingId && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        // Klick außerhalb des Input-Feldes - speichere die Änderung
        const value = editingValue || '';
        saveEdit(editingId, value);
      }
    };

    if (editingId) {
      // Füge Event-Listener hinzu, wenn Edit-Modus aktiv ist
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      // Entferne Event-Listener beim Cleanup
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingId, editingValue]);

  // Play/Pause-Handler: API-Aufruf und Status aktualisieren
  const onPlayPause = (element: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = element.id;
    
    const isRunning = automationStatus[id] === 'on';
    const endpoint = isRunning ? `api/automations/${id}/stop` : `api/automations/${id}/start`;
    fetch(getApiUrl(endpoint), { method: 'POST' })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(() => {
        // Nach erfolgreichem Start/Stop Status neu abfragen
        fetchAutomationStatus([id]);
      })
      .catch(() => {
        // Fehlerbehandlung: Status trotzdem neu abfragen
        fetchAutomationStatus([id]);
      });
  };

  // Editiermodus aktivieren
  const onRename = (element: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const name = element.name && typeof element.name === 'string' ? element.name : '';
    setEditingValue(name);
    setEditingId(element.id);
  };

  // Hilfsfunktion: neue eindeutige ID generieren
  const generateId = () => 'folder_' + Math.random().toString(36).substr(2, 9);

  // Hilfsfunktion: Eindeutigen Standardnamen für Automatisierung generieren
  const getDefaultAutomationName = () => {
    const base = 'Neue Automatisierung';
    const children = treeObj?.children || [];
    const names = new Set(
      children
        .filter((c: any) => c && c.type !== 'folder')
        .map((c: any) => (c.name && typeof c.name === 'string') ? c.name : '')
        .filter(Boolean)
    );
    if (!names.has(base)) return base;
    let i = 2;
    while (names.has(`${base} (${i})`)) i++;
    return `${base} (${i})`;
  };

  // Neue Automatisierung anlegen
  const handleNewAutomation = () => {
    if (!treeObj) return;
    const newId = 'automation_' + Math.random().toString(36).substr(2, 9);
    const defaultName = getDefaultAutomationName();
    const newAutomation = { name: defaultName, type: 'automation', id: newId };
    let updatedTree;
    
    if (selectedId) {
      const addToFolder = (node: any): any => {
        if (node.id === selectedId && node.type === 'folder') {
          return { ...node, children: [...(node.children || []), newAutomation] };
        }
        if (node.children) {
          return { ...node, children: node.children.map(addToFolder) };
        }
        return node;
      };
      updatedTree = addToFolder(treeObj);
      
      // Klappe den Zielordner auf, falls er geschlossen ist
      setExpandedIds(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return prevArray.includes(selectedId) ? prevArray : [...prevArray, selectedId];
      });
    } else {
      updatedTree = {
        ...treeObj,
        children: [...(treeObj.children || []), newAutomation]
      };
    }
    
    setTreeObj(updatedTree);
    // setTreeData(flattenTreeWithType(updatedTree)); // This line was removed as per the edit hint.
    setEditingValue(defaultName);
    setEditingId(newId);
  };

  // Hilfsfunktion: Eindeutigen Standardnamen für Ordner generieren
  const getDefaultFolderName = () => {
    const base = 'Neuer Ordner';
    const children = treeObj?.children || [];
    const names = new Set(
      children
        .filter((c: any) => c && c.type === 'folder')
        .map((c: any) => (c.name && typeof c.name === 'string') ? c.name : '')
        .filter(Boolean)
    );
    if (!names.has(base)) return base;
    let i = 2;
    while (names.has(`${base} (${i})`)) i++;
    return `${base} (${i})`;
  };

  // Neuen Ordner anlegen
  const handleNewFolder = () => {
    if (!treeObj) return;
    const newId = generateId();
    const defaultName = getDefaultFolderName();
    const newFolder = { name: defaultName, type: 'folder', id: newId, children: [] };
    let updatedTree;
    
    if (selectedId) {
      const addToFolder = (node: any): any => {
        if (node.id === selectedId && node.type === 'folder') {
          return { ...node, children: [...(node.children || []), newFolder] };
        }
        if (node.children) {
          return { ...node, children: node.children.map(addToFolder) };
        }
        return node;
      };
      updatedTree = addToFolder(treeObj);
      
      // Klappe den Zielordner auf, falls er geschlossen ist
      setExpandedIds(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        const newExpandedIds = prevArray.includes(selectedId) ? prevArray : [...prevArray, selectedId];
        // Klappe auch den neuen Ordner auf
        return newExpandedIds.includes(newId) ? newExpandedIds : [...newExpandedIds, newId];
      });
    } else {
      updatedTree = {
        ...treeObj,
        children: [...(treeObj.children || []), newFolder]
      };
      
      // Klappe den neuen Ordner auf (nur bei Root-Ebene)
      setExpandedIds(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        return prevArray.includes(newId) ? prevArray : [...prevArray, newId];
      });
    }
    
    setTreeObj(updatedTree);
    // setTreeData(flattenTreeWithType(updatedTree)); // This line was removed as per the edit hint.
    setEditingValue(defaultName);
    setEditingId(newId);
  };

  // Hilfsfunktion: entity_id aus Alias generieren (Slugify wie im Backend)
  function slugify(str: string) {
    return str
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // Alias-Validierung und entity_id-Vorschau
  const [aliasWarning, setAliasWarning] = useState<string | null>(null);
  const [entityIdPreview, setEntityIdPreview] = useState<string>('');

  // Beim Editieren/Umbenennen prüfen
  useEffect(() => {
    if (editingId && editingValue !== undefined) {
      const alias = editingValue.trim();
      const slug = slugify(alias);
      setEntityIdPreview(slug ? `automation.${slug}` : '');
      if (!alias || !slug) {
        setAliasWarning('Alias darf nicht leer sein und muss mindestens einen Buchstaben oder eine Zahl enthalten.');
      } else {
        setAliasWarning(null);
      }
    } else {
      setEntityIdPreview('');
      setAliasWarning(null);
    }
  }, [editingId, editingValue]);

  // Speichern des Namens (Alias-Validierung)
  const saveEdit = (id: string, newName: string) => {
    if (!treeObj || !id) return;
    const alias = newName.trim();
    const slug = slugify(alias);
    if (!alias || !slug) {
      setAliasWarning('Alias darf nicht leer sein und muss mindestens einen Buchstaben oder eine Zahl enthalten.');
      return;
    }
    
    // Verwende den aktuellen Wert aus dem Tree, falls newName leer ist
    let finalName = 'Unbenannt';
    if (newName && typeof newName === 'string' && newName.trim()) {
      finalName = newName.trim();
    } else {
      // Finde den aktuellen Namen im Tree
      const findCurrentName = (node: any): string => {
        if (node.id === id) return node.name || 'Unbenannt';
        if (node.children) {
          for (const child of node.children) {
            const found = findCurrentName(child);
            if (found) return found;
          }
        }
        return 'Unbenannt';
      };
      finalName = findCurrentName(treeObj);
    }
    
    const updatedTree = updateNameInTree(treeObj, id, finalName);
    
    setTreeObj(updatedTree);
    // setTreeData(flattenTreeWithType(updatedTree)); // This line was removed as per the edit hint.
    setEditingId(null);
    setEditingValue('');
    
    // Backend speichern (ohne erneutes Laden)
    fetch(getApiUrl('api/scripts'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTree)
    }).catch(error => {
      console.error('Fehler beim Speichern:', error);
      });
  };

  // Abbrechen
  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  // Löschen
  const onDelete = (element: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(element);
  };

  const confirmDelete = () => {
    if (!treeObj || !deleteTarget) return;
    const removeById = (node: any, removeId: string): any => {
      if (!node.children) return node;
      return {
        ...node,
        children: node.children
          .filter((child: any) => child.id !== removeId)
          .map((child: any) => removeById(child, removeId))
      };
    };
    const updatedTree = removeById(treeObj, deleteTarget.id);
    setTreeObj(updatedTree);
    // setTreeData(flattenTreeWithType(updatedTree)); // This line was removed as per the edit hint.
    if (editingId === deleteTarget.id) {
      setEditingId(null);
      setEditingValue('');
    }
    setDeleteTarget(null);
    
    fetch(getApiUrl('api/scripts'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTree)
    }).catch(error => {
      console.error('Fehler beim Löschen:', error);
      });
  };

  const cancelDelete = () => setDeleteTarget(null);

  // Alle Branch-IDs sammeln
  const getAllBranchIds = () => treeData.filter((n: any) => n.children && n.children.length > 0).map((n: any) => n.id);

  // Auf-/Zuklappen
  const handleExpandCollapseAll = () => {
    if (allExpanded) {
      setExpandedIds([]);
      setAllExpanded(false);
    } else {
      setExpandedIds(getAllBranchIds());
      setAllExpanded(true);
    }
  };

  // Drag & Drop
  const handleDropNode = (dragId: string, dropId: string) => {
    if (!treeObj) return;
    
    const removeNode = (node: any, removeId: string): [any, any | null] => {
      if (!node.children) return [node, null];
      let removed: any = null;
      const filtered = node.children.filter((child: any) => {
        if (child.id === removeId) {
          removed = child;
          return false;
        }
        return true;
      });
      let newChildren = filtered.map((child: any) => {
        const [newChild, found] = removeNode(child, removeId);
        if (found) removed = found;
        return newChild;
      });
      return [{ ...node, children: newChildren }, removed];
    };
    
    const addNode = (node: any, targetId: string, toAdd: any): any => {
      if (node.id === targetId && node.type === 'folder') {
        return { ...node, children: [...(node.children || []), toAdd] };
      }
      if (node.children) {
        return { ...node, children: node.children.map((child: any) => addNode(child, targetId, toAdd)) };
      }
      return node;
    };
    
    const rootObj = treeObj.id ? treeObj : { ...treeObj, id: 'root' };
    const [treeWithout, movedNode] = removeNode(rootObj, dragId);
    if (!movedNode) return;
    const newTree = addNode(treeWithout, dropId, movedNode);
    
    setTreeObj(newTree);
    // setTreeData(flattenTreeWithType(newTree)); // This line was removed as per the edit hint.
    
    fetch(getApiUrl('api/scripts'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTree)
    }).catch(error => {
      console.error('Fehler beim Drag & Drop:', error);
      });
  };

  // Toolbar-Integration
  const folders = treeData.filter((n: any) => n.type === 'folder').map((n: any) => ({ id: n.id, name: n.name }));
      const selectedAutomation = treeData.find((n: any) => n.id === selectedId && n.type !== 'folder');
    const currentFolderId = selectedAutomation ? selectedAutomation.parent : null;
    const currentAutomationName = selectedAutomation ? selectedAutomation.name : null;

    const moveAutomationToFolder = useCallback((folderId: string) => {
      if (!selectedAutomation || !folderId || !treeObj) return;
    
    const removeNode = (node: any, removeId: string): [any, any | null] => {
      if (!node.children) return [node, null];
      let removed: any = null;
      const filtered = node.children.filter((child: any) => {
        if (child.id === removeId) {
          removed = child;
          return false;
        }
        return true;
      });
      let newChildren = filtered.map((child: any) => {
        const [newChild, found] = removeNode(child, removeId);
        if (found) removed = found;
        return newChild;
      });
      return [{ ...node, children: newChildren }, removed];
    };
    
    const addNode = (node: any, targetId: string, toAdd: any): any => {
      if (node.id === targetId && node.type === 'folder') {
        return { ...node, children: [...(node.children || []), toAdd] };
      }
      if (node.children) {
        return { ...node, children: node.children.map((child: any) => addNode(child, targetId, toAdd)) };
      }
      return node;
    };
    
          const [treeWithout, movedNode] = removeNode(treeObj, selectedAutomation.id);
      if (!movedNode) return;
    const newTree = addNode(treeWithout, folderId, movedNode);
    
    setTreeObj(newTree);
    // setTreeData(flattenTreeWithType(newTree)); // This line was removed as per the edit hint.
    
    fetch(getApiUrl('api/scripts'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTree)
    }).catch(error => {
      console.error('Fehler beim Drag & Drop:', error);
    });
        }, [selectedAutomation, treeObj]);

  // Callback für Toolbar
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange({
        folders,
        currentFolderId,
        currentAutomationName,
        currentAutomationId: selectedAutomation ? selectedId : null,
        currentAutomationStatus: selectedId ? automationStatus[selectedId] : undefined,
        moveAutomationToFolder,
      });
    }
  }, [folders, currentFolderId, currentAutomationName, selectedId, automationStatus, moveAutomationToFolder, onSelectionChange]);

  return (
    <DndProvider backend={HTML5Backend}>
      <aside className="sidebar">
        <div className="sidebar-toolbar" style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid #333' }}>
          <button title="Neuer Ordner" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={handleNewFolder}><FaFolderPlusIcon /></button>
                          <button title="Neue Automatisierung" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={handleNewAutomation}><FaFileIcon /></button>
          <button title="Nach oben" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><FaArrowUpIcon /></button>
          <button title="Nach unten" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><FaArrowDownIcon /></button>
          <button
            title={allExpanded ? 'Alle zuklappen' : 'Alle aufklappen'}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            onClick={handleExpandCollapseAll}
          >
            {allExpanded ? <FaFolderClosedIcon /> : <FaFolderOpenIcon />}
          </button>
        </div>
        
        {/* Suchleiste */}
        <div style={{ 
          padding: '8px 12px', 
          borderBottom: '1px solid #333',
          background: '#2a2a2a'
        }}>
          <input
            type="text"
            placeholder="Ordner und Skripte suchen..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: 4,
              fontSize: '14px',
              outline: 'none'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setFilterText('');
              }
            }}
          />
        </div>
        
        <div 
          className="sidebar-tree" 
          style={{ flex: 1, overflow: 'auto', padding: 12 }}
          onClick={(e) => {
            // Wenn auf den Container selbst geklickt wird (nicht auf ein Element), Auswahl aufheben
            if (e.target === e.currentTarget) {
              setSelectedId(null);
            }
          }}
        >
          {treeData && treeData.length > 0 ? (
            <TreeView
              data={sanitizeTreeData(treeData)}
              aria-label="Script-Explorer"
              expandedIds={expandedIds}
              onExpand={({ element, isExpanded }) => {
                if (isExpanded) {
                  setExpandedIds(prev => prev.includes(element.id) ? prev : [...prev, element.id]);
                } else {
                  setExpandedIds(prev => prev.filter(id => id !== element.id));
                }
              }}
              onNodeSelect={({ element }: any) => setSelectedId(element.id)}
              nodeRenderer={({ element, isBranch, isExpanded, getNodeProps, level }: any) => {
                // Debug: Prüfe problematische Elemente
                if (typeof element.name !== 'string') {
                  console.warn('TreeView nodeRenderer: Element ohne gültigen Namen:', element);
                }
                return (
                <DraggableTreeNode element={element} onDropNode={handleDropNode}>
                  <div
                    {...getNodeProps({
                      onClick: (e: any) => {
                        setSelectedId(element.id);
                      }
                    })}
                    style={{
                      paddingLeft: 8 + 16 * (level - 1),
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      justifyContent: 'space-between',
                      background: selectedId === element.id ? '#2a4155' : undefined,
                      borderRadius: selectedId === element.id ? 4 : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {element.type === 'folder'
                        ? (
                            <div style={{ position: 'relative' }}>
                              {isExpanded
                                ? <FaRegFolderOpenIcon color="#f7c873" className="icon" style={{ cursor: 'pointer' }} onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setExpandedIds(prev => prev.filter(id => id !== element.id));
                                  }} />
                                : <FaRegFolderIcon color="#f7c873" className="icon" style={{ cursor: 'pointer' }} onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setExpandedIds(prev => prev.includes(element.id) ? prev : [...prev, element.id]);
                                  }} />
                              }
                              {/* Badge mit Anzahl der Elemente */}
                              {(() => {
                                // Nur berechnen wenn es ein Ordner ist und nicht im Edit-Modus
                                if (element.type === 'folder' && editingId !== element.id) {
                                  const count = countItemsInFolder(treeObj, element.id);
                                  if (count > 0) {
                                    return (
                                      <div style={{
                                        position: 'absolute',
                                        top: -6,
                                        right: -6,
                                        background: '#e74c3c',
                                        color: '#fff',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        borderRadius: '50%',
                                        width: '16px',
                                        height: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        lineHeight: 1,
                                        minWidth: '16px'
                                      }}>
                                        {count > 99 ? '99+' : count}
                                      </div>
                                    );
                                  }
                                }
                                return null;
                              })()}
                            </div>
                          )
                        : <FaFileIcon color="#8ecae6" className="icon" />}
                      {editingId === element.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <input
                            ref={inputRef}
                            key={element.id}
                            value={editingValue || ''}
                            onChange={e => {
                              const value = e?.target?.value;
                              setEditingValue(value || '');
                            }}
                            onKeyDown={e => {
                              if (e?.key === 'Enter') {
                                const value = editingValue || '';
                                saveEdit(element.id, value);
                              }
                              if (e?.key === 'Escape') cancelEdit();
                            }}
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                              fontSize: 16,
                              fontFamily: 'monospace',
                              background: '#333',
                              color: '#fff',
                              border: '1px solid #555',
                              borderRadius: 3,
                              padding: '2px 6px',
                              minWidth: 40
                            }}
                          />
                          {entityIdPreview && (
                            <span style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>entity_id: {entityIdPreview}</span>
                          )}
                          {aliasWarning && (
                            <span style={{ fontSize: 11, color: '#e74c3c', marginTop: 2 }}>{aliasWarning}</span>
                          )}
                        </div>
                      ) : (
                        <span>{element.name ?? ''}</span>
                      )}
                    </div>
                    {element.type === 'folder' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          title="Umbenennen"
                          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 2 }}
                          onClick={e => onRename(element, e)}
                        >
                          <FaPenIcon size={14} />
                        </button>
                        <button
                          title="Löschen"
                          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 2 }}
                          onClick={e => onDelete(element, e)}
                        >
                          <FaTrashIcon size={14} />
                        </button>
                      </div>
                    )}
                    {element.type !== 'folder' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          title={automationStatus[element.id] === 'on' ? 'Pause' : 'Starten'}
                          style={{ background: 'none', border: 'none', color: automationStatus[element.id] === 'on' ? '#4ecdc4' : '#aaa', cursor: automationStatus[element.id] ? 'pointer' : 'not-allowed', padding: 2, opacity: automationStatus[element.id] ? 1 : 0.5 }}
                          onClick={e => automationStatus[element.id] ? onPlayPause(element, e) : undefined}
                          disabled={!automationStatus[element.id]}
                        >
                          {automationStatus[element.id] === 'on' ? <FaPauseIcon size={14} /> : <FaPlayIcon size={14} />}
                        </button>
                        {!automationStatus[element.id] && (
                          <span style={{ fontSize: 11, color: '#e74c3c', marginLeft: 2 }}>Nicht geladen</span>
                        )}
                        <button
                          title="Umbenennen"
                          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 2 }}
                          onClick={e => onRename(element, e)}
                        >
                          <FaPenIcon size={14} />
                        </button>
                        <button
                          title="Löschen"
                          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 2 }}
                          onClick={e => onDelete(element, e)}
                        >
                          <FaTrashIcon size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </DraggableTreeNode>
              );
              }}
            />
          ) : (
            <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
              {filterText.trim() ? 'Keine Ergebnisse gefunden.' : 'Keine Automatisierungen gefunden oder Daten ungültig.'}
            </div>
          )}
          {/* Modal für Lösch-Bestätigung */}
          {deleteTarget && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}>
              <div style={{
                background: '#222',
                color: '#fff',
                padding: 32,
                borderRadius: 8,
                minWidth: 320,
                boxShadow: '0 4px 24px #000a'
              }}>
                <div style={{ fontSize: 18, marginBottom: 16 }}>
                  Ordner wirklich löschen?
                </div>
                <div style={{ marginBottom: 24 }}>
                  Möchtest du den Ordner <b>{deleteTarget.name || 'Unbenannt'}</b> und alle Unterelemente wirklich löschen?
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
                  <button onClick={cancelDelete} style={{ padding: '6px 18px', background: '#444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Abbrechen</button>
                  <button onClick={confirmDelete} style={{ padding: '6px 18px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Löschen</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </DndProvider>
  );
};

export default Sidebar; 