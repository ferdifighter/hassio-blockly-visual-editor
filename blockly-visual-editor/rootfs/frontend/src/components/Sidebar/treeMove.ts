export type TreeNode = {
  id: string;
  name?: string;
  type?: string;
  children?: TreeNode[];
  [key: string]: unknown;
};

export function findNodeById(node: TreeNode | null | undefined, id: string | null | undefined): TreeNode | null {
  if (!node || !id) {
    return null;
  }
  if (node.id === id) {
    return node;
  }
  for (const child of node.children || []) {
    const found = findNodeById(child, id);
    if (found) {
      return found;
    }
  }
  return null;
}

export function findParentNode(
  node: TreeNode | null | undefined,
  id: string | null | undefined,
  parent: TreeNode | null = null,
): TreeNode | null {
  if (!node || !id) {
    return null;
  }
  if (node.id === id) {
    return parent;
  }
  for (const child of node.children || []) {
    const found = findParentNode(child, id, node);
    if (found) {
      return found;
    }
  }
  return null;
}

export function isDescendantId(node: TreeNode | null | undefined, id: string | null | undefined): boolean {
  if (!node || !id) {
    return false;
  }
  for (const child of node.children || []) {
    if (child.id === id || isDescendantId(child, id)) {
      return true;
    }
  }
  return false;
}

export function removeNodeFromTree(node: TreeNode, removeId: string): [TreeNode, TreeNode | null] {
  if (!node.children) {
    return [node, null];
  }
  let removed: TreeNode | null = null;
  const kept: TreeNode[] = [];
  for (const child of node.children) {
    if (child.id === removeId) {
      removed = child;
      continue;
    }
    const [updated, found] = removeNodeFromTree(child, removeId);
    if (found) {
      removed = found;
    }
    kept.push(updated);
  }
  return [{ ...node, children: kept }, removed];
}

export function addNodeToParent(node: TreeNode, parentId: string, toAdd: TreeNode): TreeNode {
  if (node.id === parentId) {
    return { ...node, children: [...(node.children || []), toAdd] };
  }
  if (!node.children) {
    return node;
  }
  return {
    ...node,
    children: node.children.map((child) => addNodeToParent(child, parentId, toAdd)),
  };
}

export function moveNodeInTree(tree: TreeNode | null | undefined, dragId: string, dropId: string): TreeNode | null | undefined {
  if (!tree || !dragId || !dropId || dragId === dropId) {
    return tree;
  }

  const rootId = tree.id || 'root';
  const dropIsRoot = dropId === 'root' || dropId === rootId;
  const dragged = findNodeById(tree, dragId);
  if (!dragged) {
    return tree;
  }

  const currentParent = findParentNode(tree, dragId);
  let parentId = rootId;
  if (!dropIsRoot) {
    const dropNode = findNodeById(tree, dropId);
    if (!dropNode) {
      return tree;
    }
    if (dropNode.type === 'folder') {
      if (currentParent?.id === dropNode.id) {
        parentId = findParentNode(tree, dropNode.id)?.id || rootId;
      } else {
        parentId = dropNode.id;
      }
    } else {
      parentId = findParentNode(tree, dropId)?.id || rootId;
    }
  }

  if (dragged.type === 'folder' && (parentId === dragId || isDescendantId(dragged, parentId))) {
    return tree;
  }

  if ((currentParent?.id || rootId) === parentId) {
    return tree;
  }

  const [without, moved] = removeNodeFromTree(tree, dragId);
  if (!moved) {
    return tree;
  }
  return addNodeToParent(without, parentId, moved);
}
