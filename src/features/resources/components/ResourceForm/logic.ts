import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';

import { getErrorMessageKey } from 'api/http';
import { applyServerFieldErrors } from 'forms';
import type { I18nKey } from 'i18n';
import { runDetached } from 'utils/async';

import {
  resourceFormSchema,
  type Resource,
  type ResourceFormOutput,
  type ResourceFormValues,
} from '../../model';
import { useSaveResource } from '../../queries';

const emptyValues: ResourceFormValues = {
  name: '',
  description: '',
  category: 'general',
  quantity: null,
  status: 'active',
  featured: false,
};

const toFormValues = (resource: Resource): ResourceFormValues => ({
  name: resource.name,
  description: resource.description,
  category: resource.category,
  quantity: resource.quantity,
  status: resource.status,
  featured: resource.featured,
});

/**
 * Create/edit form state. The form is remounted per dialog opening (keyed by
 * resource), so initial values come straight from props — no syncing effect.
 */
export const useResourceForm = ({
  resource,
  onSaved,
}: {
  resource?: Resource | undefined;
  onSaved: (saved: Resource) => void;
}) => {
  const save = useSaveResource();
  const [formErrorKey, setFormErrorKey] = useState<I18nKey | null>(null);
  const form = useForm<ResourceFormValues, unknown, ResourceFormOutput>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: resource ? toFormValues(resource) : emptyValues,
  });

  const submit = form.handleSubmit(async (input) => {
    setFormErrorKey(null);
    try {
      const saved = await save.mutateAsync({ id: resource?.id, input });
      onSaved(saved);
    } catch (error) {
      // 422 field codes go next to their fields (first one focused);
      // anything else becomes a form-level, localized message.
      const applied = applyServerFieldErrors(error, form.setError, [
        'name',
        'description',
        'category',
        'quantity',
        'status',
        'featured',
      ]);
      setFormErrorKey(
        applied ? 'forms.errors.summary' : getErrorMessageKey(error),
      );
    }
  });

  return {
    form,
    formErrorKey,
    isSaving: save.isPending,
    onSubmit: (event: FormEvent<HTMLFormElement>) => runDetached(submit(event)),
  };
};
