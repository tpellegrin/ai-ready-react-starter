import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { getErrorMessageKey } from 'api/http';
import { useToast } from 'components/Toast';
import { useI18n } from 'i18n/provider';
import { runDetached } from 'utils/async';

import type { Resource, ResourceFilter } from '../../model';
import { resourceListQuery, useDeleteResource } from '../../queries';
import type { ResourceEditor } from '../ResourceFormDialog';

/**
 * Server state lives in TanStack Query; dialog/confirm state is local; the
 * filter comes from the route (URL). Derived values are computed during
 * render — nothing is mirrored into state with effects.
 */
export const useResourceCatalog = (filter: ResourceFilter) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const list = useQuery(resourceListQuery(filter));
  const remove = useDeleteResource();
  const [editor, setEditor] = useState<ResourceEditor>({ mode: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);

  const view = list.isPending
    ? 'pending'
    : list.isError
      ? 'error'
      : list.data.length === 0
        ? 'empty'
        : 'success';

  const confirmDelete = () => {
    if (!pendingDelete) return;
    runDetached(
      remove.mutateAsync(pendingDelete.id).then(() => {
        setPendingDelete(null);
        showToast({ title: t('resources.toast.deleted') });
      }),
      // The error stays visible inside the confirmation dialog (remove.error).
      () => undefined,
    );
  };

  return {
    view,
    items: list.data ?? [],
    listErrorKey: list.isError ? getErrorMessageKey(list.error) : null,
    isRetrying: list.isFetching,
    retry: () => runDetached(list.refetch()),
    editor,
    openCreate: () => setEditor({ mode: 'create' }),
    openEdit: (resource: Resource) => setEditor({ mode: 'edit', resource }),
    closeEditor: () => setEditor({ mode: 'closed' }),
    onSaved: (mode: 'create' | 'edit') => {
      setEditor({ mode: 'closed' });
      showToast({
        title:
          mode === 'create'
            ? t('resources.toast.created')
            : t('resources.toast.updated'),
      });
    },
    pendingDelete,
    requestDelete: (resource: Resource) => {
      remove.reset();
      setPendingDelete(resource);
    },
    cancelDelete: () => setPendingDelete(null),
    confirmDelete,
    isDeleting: remove.isPending,
    deleteErrorKey: remove.isError ? getErrorMessageKey(remove.error) : null,
  };
};
