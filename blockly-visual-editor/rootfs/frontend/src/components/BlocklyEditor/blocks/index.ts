import * as Blockly from 'blockly';
import { EntityField } from './EntityField';
import { HA_BLOCK_DEFINITIONS } from './definitions';

let registered = false;

export function registerAllHomeAssistantBlocks(): void {
  if (registered) {
    return;
  }

  try {
    Blockly.fieldRegistry.register('field_entity', EntityField);
  } catch {
    // Field ist bereits registriert (Hot-Reload / Tests)
  }

  Blockly.common.defineBlocksWithJsonArray(HA_BLOCK_DEFINITIONS as Parameters<typeof Blockly.common.defineBlocksWithJsonArray>[0]);
  registered = true;
}

export { EntityField };
