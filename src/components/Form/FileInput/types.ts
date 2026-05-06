export type FileInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  onSelectFiles: (files: File[]) => void;
  resetKey?: string | number;
};
