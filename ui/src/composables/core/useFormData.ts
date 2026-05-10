import { readonly, ref, type Ref } from 'vue';
import type { PresetFormData } from '../../types';

const formData: Ref<PresetFormData> = ref({
  attributeValue: 10,
  dc: 50,
  modifier: 0,
  customFields: {},
});

export function useFormData(): {
  data: Readonly<Ref<PresetFormData>>;
  updateField: (field: keyof PresetFormData, value: unknown) => void;
  updateCustomField: (id: string, value: number | string | boolean) => void;
  reset: () => void;
} {
  function updateField(field: keyof PresetFormData, value: unknown): void {
    (formData.value as unknown as Record<string, unknown>)[field] = value;
  }

  function updateCustomField(id: string, value: number | string | boolean): void {
    formData.value.customFields[id] = value;
  }

  function reset(): void {
    formData.value = {
      attributeValue: 10,
      dc: 50,
      modifier: 0,
      customFields: {},
    };
  }

  return {
    data: readonly(formData),
    updateField,
    updateCustomField,
    reset,
  };
}
