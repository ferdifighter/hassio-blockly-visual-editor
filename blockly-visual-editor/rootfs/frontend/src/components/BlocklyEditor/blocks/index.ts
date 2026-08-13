import * as Blockly from 'blockly';
import { EntityField } from './EntityField';
import { NotifyTargetField } from './NotifyTargetField';
import { HA_BLOCK_DEFINITIONS } from './definitions';

let registered = false;

export function registerAllHomeAssistantBlocks(): void {
  if (registered) {
    return;
  }

  try {
    Blockly.fieldRegistry.register('field_entity', EntityField);
  } catch {
    // already registered
  }
  try {
    Blockly.fieldRegistry.register('field_notify_target', NotifyTargetField);
  } catch {
    // already registered
  }

  Blockly.common.defineBlocksWithJsonArray(HA_BLOCK_DEFINITIONS as Parameters<typeof Blockly.common.defineBlocksWithJsonArray>[0]);
  registered = true;
}

export { EntityField };
