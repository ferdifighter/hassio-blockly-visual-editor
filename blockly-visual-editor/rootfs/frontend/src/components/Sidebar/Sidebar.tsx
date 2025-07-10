import React, { useEffect, useState, useRef } from 'react';
import TreeView, { flattenTree } from 'react-accessible-treeview';
import { FaFolderPlus, FaFile, FaArrowUp, FaArrowDown, FaRegFolder, FaRegFolderOpen, FaPen, FaTrash, FaPlay, FaPause, FaFolderOpen, FaFolderClosed } from 'react-icons/fa6';
import './Sidebar.css';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Toolbar from '../Toolbar/Toolbar';

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
  const flat: any[] = [];
  const { children, ...rest } = node;
  flat.push({
    ...rest,
    parent: parent ? parent.id : null,
    children: children ? children.map((c: any) => c.id) : [],
    level,
    type: node.type,
  });
  if (children && children.length > 0) {
    children.forEach((child: any) => {
      flat.push(...flattenTreeWithType(child, node, level + 1));
    });
  }
  return flat;
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
    currentScriptName: string | null;
    moveScriptToFolder: (folderId: string) => void;
  }) => void;
}
const Sidebar: React.FC<SidebarProps> = ({ onSelectionChange }) => {
  const [treeObj, setTreeObj] = useState<any>(null);
  const [treeData, setTreeData] = useState<any[]>([]);
  const [runningScriptId, setRunningScriptId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<(string | number)[]>([]);
  const [allExpanded, setAllExpanded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tree-Daten beim Start laden
  useEffect(() => {
    fetch('http://localhost:5000/api/scripts')
      .then(res => res.json())
      .then(data => {
        if (!data || typeof data !== 'object' || !Array.isArray(data.children)) {
          // Fallback auf leeren Tree
          setTreeObj({ name: '', children: [] });
          setTreeData([]);
        } else {
          setTreeObj(data);
          setTreeData(flattenTreeWithType(data));
        }
      })
      .catch(() => {
        setTreeObj({ name: '', children: [] });
        setTreeData([]);
      });
  }, []);

  // Handler für Play/Pause
  const onPlayPause = (element: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (runningScriptId === element.id) {
      setRunningScriptId(null); // Pause
    } else {
      setRunningScriptId(element.id); // Play
    }
  };

  // Editiermodus aktivieren
  const onRename = (element: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(element.id);
    setEditingValue(element.name);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Hilfsfunktion: neue eindeutige ID generieren
  const generateId = () => 'folder_' + Math.random().toString(36).substr(2, 9);

  // Neues Script im gewählten Ordner oder Root anlegen und direkt editieren
  const handleNewScript = () => {
    if (!treeObj) return;
    const newId = 'script_' + Math.random().toString(36).substr(2, 9);
    const newScript = { name: '', type: 'script', id: newId };
    let updatedTree;
    if (selectedId) {
      // Ziel-Ordner suchen
      const addToFolder = (node: any): any => {
        if (node.id === selectedId && node.type === 'folder') {
          return { ...node, children: [...(node.children || []), newScript] };
        }
        if (node.children) {
          return { ...node, children: node.children.map(addToFolder) };
        }
        return node;
      };
      updatedTree = addToFolder(treeObj);
    } else {
      updatedTree = {
        ...treeObj,
        children: [...(treeObj.children || []), newScript]
      };
    }
    setTreeObj(updatedTree);
    setTreeData(flattenTreeWithType(updatedTree));
    setEditingId(newId);
    setEditingValue('');
    // Noch nicht ans Backend senden, erst nach Eingabe
  };

  // Neuen Ordner im gewählten Ordner oder Root anlegen und direkt editieren
  const handleNewFolder = () => {
    if (!treeObj) return;
    const newId = generateId();
    const newFolder = { name: '', type: 'folder', id: newId, children: [] };
    let updatedTree;
    if (selectedId) {
      // Ziel-Ordner suchen
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
    } else {
      updatedTree = {
        ...treeObj,
        children: [...(treeObj.children || []), newFolder]
      };
    }
    setTreeObj(updatedTree);
    setTreeData(flattenTreeWithType(updatedTree));
    setEditingId(newId);
    setEditingValue('');
    setExpandedIds(prev => Array.isArray(prev) ? [...prev, newId] : [newId]);
    // Noch nicht ans Backend senden, erst nach Eingabe
  };

  // Hilfsfunktion: Eindeutigen Standardnamen generieren
  const getDefaultFolderName = () => {
    const base = 'Neuer Ordner';
    const names = new Set(
      (treeObj?.children || []).filter((c: any) => c.type === 'folder').map((c: any) => c.name)
    );
    if (!names.has(base)) return base;
    let i = 2;
    while (names.has(`${base} (${i})`)) i++;
    return `${base} (${i})`;
  };

  // Hilfsfunktion: Eindeutigen Standardnamen für Script generieren
  const getDefaultScriptName = () => {
    const base = 'Neues Script';
    const names = new Set(
      (treeObj?.children || []).filter((c: any) => c.type !== 'folder').map((c: any) => c.name)
    );
    if (!names.has(base)) return base;
    let i = 2;
    while (names.has(`${base} (${i})`)) i++;
    return `${base} (${i})`;
  };

  // Fokussiere das Input-Feld, wenn editingId gesetzt ist
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  // Speichern des neuen Namens
  const saveEdit = (id: string, newName: string) => {
    if (!treeObj) return;
    let updatedTree;
    let finalName = newName.trim();
    // Ordner oder Script?
    const isFolder = (treeObj.children || []).find((c: any) => c.id === id)?.type === 'folder';
    if (!finalName) {
      finalName = isFolder ? getDefaultFolderName() : getDefaultScriptName();
    }
    updatedTree = updateNameInTree(treeObj, id, finalName);
    setTreeObj(updatedTree);
    setTreeData(flattenTreeWithType(updatedTree));
    setEditingId(null);
    setEditingValue('');
    // Speichern im Backend
    fetch('http://localhost:5000/api/scripts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTree)
    })
      .then(res => res.ok && res.json())
      .then(() => {
        fetch('http://localhost:5000/api/scripts')
          .then(res => res.json())
          .then(data => {
            setTreeObj(data);
            setTreeData(flattenTreeWithType(data));
          });
      });
  };

  // Abbrechen
  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue('');
  };

  // Platzhalter-Handler für Löschen
  const onDelete = (element: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTarget(element);
  };

  // Wirklich löschen nach Bestätigung
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
    setTreeData(flattenTreeWithType(updatedTree));
    if (editingId === deleteTarget.id) {
      setEditingId(null);
      setEditingValue('');
    }
    setDeleteTarget(null);
    fetch('http://localhost:5000/api/scripts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTree)
    })
      .then(res => res.ok && res.json())
      .then(() => {
        fetch('http://localhost:5000/api/scripts')
          .then(res => res.json())
          .then(data => {
            setTreeObj(data);
            setTreeData(flattenTreeWithType(data));
          });
      });
  };

  const cancelDelete = () => setDeleteTarget(null);

  // Alle Branch-IDs (Ordner) sammeln
  const getAllBranchIds = () => treeData.filter((n: any) => n.children && n.children.length > 0).map((n: any) => n.id);

  // Handler für Auf-/Zuklappen
  const handleExpandCollapseAll = () => {
    if (allExpanded) {
      setExpandedIds([]);
      setAllExpanded(false);
    } else {
      setExpandedIds(getAllBranchIds());
      setAllExpanded(true);
    }
  };

  // Handler für Drag & Drop
  const handleDropNode = (dragId: string, dropId: string) => {
    if (!treeObj) return;
    // 1. Node aus altem Parent entfernen
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
    // 2. Node an Ziel anhängen
    const addNode = (node: any, targetId: string, toAdd: any): any => {
      if (node.id === targetId && node.type === 'folder') {
        return { ...node, children: [...(node.children || []), toAdd] };
      }
      if (node.children) {
        return { ...node, children: node.children.map((child: any) => addNode(child, targetId, toAdd)) };
      }
      return node;
    };
    // Root-Objekt als Dummy, falls nötig
    const rootObj = treeObj.id ? treeObj : { ...treeObj, id: 'root' };
    const [treeWithout, movedNode] = removeNode(rootObj, dragId);
    if (!movedNode) return;
    const newTree = addNode(treeWithout, dropId, movedNode);
    setTreeObj(newTree);
    setTreeData(flattenTreeWithType(newTree));
    // Backend speichern
    fetch('http://localhost:5000/api/scripts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTree)
    })
      .then(res => res.ok && res.json())
      .then(() => {
        fetch('http://localhost:5000/api/scripts')
          .then(res => res.json())
          .then(data => {
            setTreeObj(data);
            setTreeData(flattenTreeWithType(data));
          });
      });
  };

  // --- Toolbar-Integration: Ordnerliste, aktuelles Script, Parent-Ordner, Move-Handler ---
  // Alle Ordner (flach, nur type: 'folder')
  const folders = treeData.filter((n: any) => n.type === 'folder').map((n: any) => ({ id: n.id, name: n.name }));
  // Aktuell ausgewähltes Script (wenn eines ausgewählt ist und type !== 'folder')
  const selectedScript = treeData.find((n: any) => n.id === selectedId && n.type !== 'folder');
  // Parent-Ordner des Scripts
  const currentFolderId = selectedScript ? selectedScript.parent : null;
  // Scriptname
  const currentScriptName = selectedScript ? selectedScript.name : null;
  // Handler: Script in anderen Ordner verschieben
  const moveScriptToFolder = (folderId: string) => {
    if (!selectedScript || !folderId || !treeObj) return;
    // 1. Script aus altem Parent entfernen
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
    // 2. Script an Ziel-Ordner anhängen
    const addNode = (node: any, targetId: string, toAdd: any): any => {
      if (node.id === targetId && node.type === 'folder') {
        return { ...node, children: [...(node.children || []), toAdd] };
      }
      if (node.children) {
        return { ...node, children: node.children.map((child: any) => addNode(child, targetId, toAdd)) };
      }
      return node;
    };
    const [treeWithout, movedNode] = removeNode(treeObj, selectedScript.id);
    if (!movedNode) return;
    const newTree = addNode(treeWithout, folderId, movedNode);
    setTreeObj(newTree);
    setTreeData(flattenTreeWithType(newTree));
    // Backend speichern
    fetch('http://localhost:5000/api/scripts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTree)
    })
      .then(res => res.ok && res.json())
      .then(() => {
        fetch('http://localhost:5000/api/scripts')
          .then(res => res.json())
          .then(data => {
            setTreeObj(data);
            setTreeData(flattenTreeWithType(data));
          });
      });
  };

  // Melde die Daten an die App, wenn sich Auswahl oder Tree ändert
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange({
        folders,
        currentFolderId,
        currentScriptName,
        moveScriptToFolder,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, currentFolderId, currentScriptName, moveScriptToFolder]);

  return (
    <DndProvider backend={HTML5Backend}>
      <aside className="sidebar" style={{
        height: '100%',
        width: '100%',
        background: '#222',
        color: '#fff',
        padding: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div className="sidebar-toolbar" style={{ display: 'flex', gap: 8, padding: 12, borderBottom: '1px solid #333' }}>
          <button title="Neuer Ordner" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={handleNewFolder}><FaFolderPlusIcon /></button>
          <button title="Neues Script" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={handleNewScript}><FaFileIcon /></button>
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
        <div className="sidebar-tree" style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {treeData && treeData.length > 0 ? (
            <TreeView
              data={treeData}
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
              nodeRenderer={({ element, isBranch, isExpanded, getNodeProps, level }: any) => (
                <DraggableTreeNode element={element} onDropNode={handleDropNode}>
                  <div
                    {...getNodeProps({
                      onClick: (e: any) => {
                        // Nur markieren, nicht expandieren
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
                            isExpanded
                              ? <FaRegFolderOpenIcon color="#f7c873" className="icon" style={{ cursor: 'pointer' }} onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  setExpandedIds(prev => prev.filter(id => id !== element.id));
                                }} />
                              : <FaRegFolderIcon color="#f7c873" className="icon" style={{ cursor: 'pointer' }} onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  setExpandedIds(prev => prev.includes(element.id) ? prev : [...prev, element.id]);
                                }} />
                          )
                        : <FaFileIcon color="#8ecae6" className="icon" />}
                      {editingId === element.id ? (
                        <input
                          ref={inputRef}
                          key={element.id}
                          value={editingValue}
                          onChange={e => setEditingValue(e.target.value)}
                          onBlur={() => saveEdit(element.id, editingValue)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(element.id, editingValue);
                            if (e.key === 'Escape') cancelEdit();
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
                      ) : (
                        <span>{element.name}</span>
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
                          title={runningScriptId === element.id ? 'Pause' : 'Starten'}
                          style={{ background: 'none', border: 'none', color: runningScriptId === element.id ? '#4ecdc4' : '#aaa', cursor: 'pointer', padding: 2 }}
                          onClick={e => onPlayPause(element, e)}
                        >
                          {runningScriptId === element.id ? <FaPauseIcon size={14} /> : <FaPlayIcon size={14} />}
                        </button>
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
              )}
            />
          ) : (
            <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
              Keine Scripts gefunden oder Daten ungültig.
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