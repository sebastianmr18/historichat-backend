/**
 * @file ContentVariantCopy.ts
 * @description Entidad de base de datos para copys (textos) de variantes de contenido.
 */
import { Entity, Column, PrimaryGeneratedColumn, Index } from "typeorm";

@Entity({ name: "app_content_variant_copy", schema: "public" })
@Index("idx_app_content_variant_copy_variant", ["contentVariant"])
@Index("idx_app_content_variant_copy_variant_page_sort", ["contentVariant", "pageKey", "sortOrder"])
export class ContentVariantCopy {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50, name: "content_variant" })
  contentVariant: string;

  @Column({ type: "varchar", length: 80, name: "copy_key" })
  copyKey: string;

  @Column({ type: "text" })
  text: string;

  @Column({ type: "varchar", length: 40, name: "page_key" })
  pageKey: string;

  @Column({ type: "integer", name: "sort_order", default: 0 })
  sortOrder: number;
}