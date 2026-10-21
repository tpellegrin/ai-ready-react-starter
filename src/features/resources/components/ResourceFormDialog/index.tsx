import { Dialog } from 'components/Dialog';
import { useI18n } from 'i18n/provider';

import type { Resource } from '../../model';
import { ResourceForm } from '../ResourceForm';

export type ResourceEditor =
  | { mode: 'closed' }
  | { mode: 'create' }
  | { mode: 'edit'; resource: Resource };

type Props = {
  editor: ResourceEditor;
  onClose: () => void;
  onSaved: (saved: Resource, mode: 'create' | 'edit') => void;
};

/** Create/edit dialog. The form remounts per opening, so it always resets. */
export const ResourceFormDialog = ({ editor, onClose, onSaved }: Props) => {
  const { t } = useI18n();
  const resource = editor.mode === 'edit' ? editor.resource : undefined;

  return (
    <Dialog
      open={editor.mode !== 'closed'}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        editor.mode === 'edit'
          ? t('resources.form.editTitle')
          : t('resources.form.createTitle')
      }
    >
      {editor.mode === 'closed' ? null : (
        <ResourceForm
          key={resource?.id ?? 'new'}
          resource={resource}
          onCancel={onClose}
          onSaved={(saved) => onSaved(saved, editor.mode)}
        />
      )}
    </Dialog>
  );
};
