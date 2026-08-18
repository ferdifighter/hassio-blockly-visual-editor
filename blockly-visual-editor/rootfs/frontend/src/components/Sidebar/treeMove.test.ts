import { describe, expect, it } from 'vitest';
import { moveNodeInTree, type TreeNode } from './treeMove';

function tree(): TreeNode {
  return {
    id: 'root',
    name: '',
    children: [
      {
        id: 'folder_1',
        name: 'Neuer Ordner',
        type: 'folder',
        children: [
          { id: 'auto_1', name: 'TestBlockly', type: 'automation' },
        ],
      },
      { id: 'auto_2', name: 'Aussen', type: 'automation' },
    ],
  };
}

describe('moveNodeInTree', () => {
  it('legt eine Automatisierung aus dem Ordner auf die oberste Ebene', () => {
    const next = moveNodeInTree(tree(), 'auto_1', 'root');
    expect(next?.children?.map((child) => child.id)).toEqual(['folder_1', 'auto_2', 'auto_1']);
    expect(next?.children?.[0].children).toEqual([]);
  });

  it('holt eine Automatisierung aus dem Ordner, wenn sie auf denselben Ordner gelegt wird', () => {
    const next = moveNodeInTree(tree(), 'auto_1', 'folder_1');
    expect(next?.children?.map((child) => child.id)).toEqual(['folder_1', 'auto_2', 'auto_1']);
    expect(next?.children?.[0].children).toEqual([]);
  });

  it('legt eine Automatisierung auf dieselbe Ebene wie das Drop-Ziel', () => {
    const next = moveNodeInTree(tree(), 'auto_1', 'auto_2');
    expect(next?.children?.map((child) => child.id)).toEqual(['folder_1', 'auto_2', 'auto_1']);
    expect(next?.children?.[0].children).toEqual([]);
  });

  it('verschiebt eine Automatisierung in einen Ordner', () => {
    const next = moveNodeInTree(tree(), 'auto_2', 'folder_1');
    expect(next?.children?.map((child) => child.id)).toEqual(['folder_1']);
    expect(next?.children?.[0].children?.map((child) => child.id)).toEqual(['auto_1', 'auto_2']);
  });

  it('verhindert, einen Ordner in sich selbst zu legen', () => {
    const source = tree();
    const next = moveNodeInTree(source, 'folder_1', 'auto_1');
    expect(next).toBe(source);
  });
});
