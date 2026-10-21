import { Button } from 'components/Button';
import { CardBase } from 'components/CardBase';
import { Flex } from 'components/Flex';
import { Text } from 'components/Text';
import { formatNumber } from 'i18n';
import { useI18n } from 'i18n/provider';

import type { Resource } from '../../model';

import {
  _ResourceItemsActions,
  _ResourceItemsBadge,
  _ResourceItemsList,
  _ResourceItemsMeta,
  _ResourceItemsRow,
} from './styles';

type Props = {
  items: readonly Resource[];
  onEdit: (resource: Resource) => void;
  onDelete: (resource: Resource) => void;
};

/** Presentational list of resources (no data fetching; see ResourceCatalog). */
export const ResourceItems = ({ items, onEdit, onDelete }: Props) => {
  const { t, lang } = useI18n();
  const dateFormat = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' });

  return (
    <_ResourceItemsList aria-label={t('resources.list.label')}>
      {items.map((resource) => (
        <li key={resource.id}>
          <CardBase>
            <_ResourceItemsRow>
              <Flex direction="column" gap="xxs" width="auto">
                <Text as="h2" variant="headingSm">
                  {resource.name}
                </Text>
                {resource.description ? (
                  <Text color="secondary">{resource.description}</Text>
                ) : null}
                <_ResourceItemsMeta>
                  <_ResourceItemsBadge>
                    {t(`resources.item.status.${resource.status}`)}
                  </_ResourceItemsBadge>
                  <_ResourceItemsBadge>
                    {t(`resources.item.category.${resource.category}`)}
                  </_ResourceItemsBadge>
                  {resource.featured ? (
                    <_ResourceItemsBadge>
                      {t('resources.item.featured')}
                    </_ResourceItemsBadge>
                  ) : null}
                </_ResourceItemsMeta>
                <Text variant="captionMd" color="secondary">
                  {t('resources.item.quantity', {
                    count: formatNumber(resource.quantity, { locale: lang }),
                  })}
                  {' · '}
                  {t('resources.item.updated', {
                    date: dateFormat.format(new Date(resource.updatedAt)),
                  })}
                </Text>
              </Flex>
              <_ResourceItemsActions>
                <Button
                  isCompact
                  size="small"
                  variant="secondary"
                  label={t('resources.actions.edit')}
                  aria-label={t('resources.actions.editItem', {
                    name: resource.name,
                  })}
                  onClick={() => onEdit(resource)}
                />
                <Button
                  isCompact
                  size="small"
                  variant="tertiary"
                  label={t('resources.actions.delete')}
                  aria-label={t('resources.actions.deleteItem', {
                    name: resource.name,
                  })}
                  onClick={() => onDelete(resource)}
                />
              </_ResourceItemsActions>
            </_ResourceItemsRow>
          </CardBase>
        </li>
      ))}
    </_ResourceItemsList>
  );
};
