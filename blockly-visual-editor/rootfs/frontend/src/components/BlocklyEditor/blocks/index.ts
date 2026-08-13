import * as Blockly from 'blockly';
import { DateField, DateTimeField } from './DateTimeField';
import { DurationField } from './DurationField';
import { EntityField, loadEntities } from './EntityField';
import { EventTypeField } from './EventTypeField';
import { HA_BLOCK_DEFINITIONS } from './definitions';
import { NotifyTargetField, loadNotifyTargets } from './NotifyTargetField';
import { OptionalNumberField } from './OptionalNumberField';
import { ServiceField, loadServices } from './ServiceField';
import { StateField } from './StateField';
import { TimeField } from './TimeField';
import { WeekdayField } from './WeekdayField';
import { refreshPickerFields } from './fieldUtils';

let registered = false;

function registerField(name: string, fieldClass: unknown): void {
  try {
    Blockly.fieldRegistry.register(name, fieldClass as Parameters<typeof Blockly.fieldRegistry.register>[1]);
  } catch {
    // already registered
  }
}

export function registerAllHomeAssistantBlocks(): void {
  if (registered) {
    return;
  }

  registerField('field_entity', EntityField);
  registerField('field_notify_target', NotifyTargetField);
  registerField('field_service', ServiceField);
  registerField('field_state', StateField);
  registerField('field_time', TimeField);
  registerField('field_datetime', DateTimeField);
  registerField('field_date', DateField);
  registerField('field_duration', DurationField);
  registerField('field_weekdays', WeekdayField);
  registerField('field_event_type', EventTypeField);
  registerField('field_optional_number', OptionalNumberField);

  Blockly.common.defineBlocksWithJsonArray(HA_BLOCK_DEFINITIONS as Parameters<typeof Blockly.common.defineBlocksWithJsonArray>[0]);
  registered = true;
}

export async function warmPickerCaches(workspace?: Blockly.Workspace | null): Promise<void> {
  await Promise.allSettled([loadEntities(), loadNotifyTargets(), loadServices()]);
  if (workspace) {
    refreshPickerFields(workspace);
  }
}

export { EntityField, loadEntities, loadNotifyTargets, loadServices };
