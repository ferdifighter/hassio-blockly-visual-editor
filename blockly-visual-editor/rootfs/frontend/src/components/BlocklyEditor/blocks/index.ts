import { registerTriggerBlocks } from './trigger';
import { registerConditionBlocks } from './conditions';
import { registerActionBlocks } from './actions';
import { registerGeraeteBlocks } from './geraete';
import { registerServiceBlocks } from './services';
import { registerNotificationBlocks } from './notifications';
import { registerTimeBlocks } from './time';
import { registerVariableBlocks } from './variables';
import { registerLogicBlocks } from './logic';

export function registerAllHomeAssistantBlocks() {
  registerTriggerBlocks();
  registerConditionBlocks();
  registerActionBlocks();
  registerGeraeteBlocks();
  registerServiceBlocks();
  registerNotificationBlocks();
  registerTimeBlocks();
  registerVariableBlocks();
  registerLogicBlocks();
} 