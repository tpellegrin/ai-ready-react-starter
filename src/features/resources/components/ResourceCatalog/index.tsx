import { useRef } from 'react';

import { Button } from 'components/Button';
import { ConfirmDialog } from 'components/ConfirmDialog';
import { EmptyState } from 'components/EmptyState';
import { ErrorState } from 'components/ErrorState';
import { Field } from 'components/Form/Field';
import { Select } from 'components/Form/Select';
import { LoadingState } from 'components/LoadingState';
import { Skeleton } from 'components/Skeleton';
import { useI18n } from 'i18n/provider';

import {
  parseResourceFilter,
  RESOURCE_FILTERS,
  type ResourceFilter,
} from '../../model';
import { ResourceFormDialog } from '../ResourceFormDialog';
import { ResourceItems } from '../ResourceItems';

import { useResourceCatalog } from './logic';
import {
  _ResourceCatalogFilter,
  _ResourceCatalogPlaceholder,
  _ResourceCatalogRoot,
  _ResourceCatalogToolbar,
} from './styles';

type Props = {
  /** Current filter (owned by the route, e.g. a URL parameter). */
  filter: ResourceFilter;
  onFilterChange: (filter: ResourceFilter) => void;
};

/**
 * Reference feature entry: list with loading/empty/error/success states,
 * create/edit dialog, delete confirmation and toasts.
 */
export const ResourceCatalog = ({ filter, onFilterChange }: Props) => {
  const { t } = useI18n();
  const catalog = useResourceCatalog(filter);
  // Focus target after deleting the row whose button opened the dialog.
  const createButtonRef = useRef<HTMLButtonElement>(null);

  const createButton = (
    <Button
      ref={createButtonRef}
      isCompact
      label={t('resources.actions.create')}
      onClick={catalog.openCreate}
    />
  );

  return (
    <_ResourceCatalogRoot aria-label={t('resources.title')}>
      <_ResourceCatalogToolbar>
        <_ResourceCatalogFilter>
          <Field label={t('resources.filter.label')}>
            {(control) => (
              <Select
                {...control}
                controlSize="small"
                value={filter}
                onChange={(event) =>
                  onFilterChange(parseResourceFilter(event.target.value))
                }
                options={RESOURCE_FILTERS.map((value) => ({
                  value,
                  label: t(`resources.filter.${value}`),
                }))}
              />
            )}
          </Field>
        </_ResourceCatalogFilter>
        {catalog.view === 'empty' ? null : createButton}
      </_ResourceCatalogToolbar>

      {catalog.view === 'pending' ? (
        <_ResourceCatalogPlaceholder>
          <LoadingState label={t('resources.list.loading')} />
          <Skeleton height="xxl" />
          <Skeleton height="xxl" />
        </_ResourceCatalogPlaceholder>
      ) : null}

      {catalog.view === 'error' && catalog.listErrorKey ? (
        <ErrorState
          title={t('resources.list.errorTitle')}
          description={t(catalog.listErrorKey)}
          onRetry={catalog.retry}
          isRetrying={catalog.isRetrying}
        />
      ) : null}

      {catalog.view === 'empty' ? (
        <EmptyState
          title={
            filter === 'all'
              ? t('resources.list.emptyTitle')
              : t('resources.list.emptyFilteredTitle')
          }
          description={t('resources.list.emptyDescription')}
          action={createButton}
        />
      ) : null}

      {catalog.view === 'success' ? (
        <ResourceItems
          items={catalog.items}
          onEdit={catalog.openEdit}
          onDelete={catalog.requestDelete}
        />
      ) : null}

      <ResourceFormDialog
        editor={catalog.editor}
        onClose={catalog.closeEditor}
        onSaved={(_saved, mode) => catalog.onSaved(mode)}
      />

      <ConfirmDialog
        open={catalog.pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) catalog.cancelDelete();
        }}
        title={t('resources.confirmDelete.title')}
        description={t('resources.confirmDelete.description', {
          name: catalog.pendingDelete?.name ?? '',
        })}
        confirmLabel={t('resources.confirmDelete.confirm')}
        isPending={catalog.isDeleting}
        error={catalog.deleteErrorKey ? t(catalog.deleteErrorKey) : undefined}
        onConfirm={catalog.confirmDelete}
        fallbackFocus={() => createButtonRef.current}
      />
    </_ResourceCatalogRoot>
  );
};
