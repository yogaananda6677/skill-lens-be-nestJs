export class CreateMasterTagDto {
  tipe!: 'minat' | 'bakat' | 'hobi' | 'pengalaman';
  label!: string;
  mapped_key!: string;
  kategori_hint?: string | null;
  sort_order?: number;
  is_active?: number;
}
