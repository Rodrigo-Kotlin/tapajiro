import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, StatusBadge } from '@tapajiro/ui';
import { OrganizationContextHeader } from '@/components/OrganizationContextHeader';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOrganizationContext } from '@/lib/organization/OrganizationContext';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  archiveMenuVersion,
  CatalogError,
  createCategory,
  createMenuDraft,
  loadCatalog,
  publishMenuVersion,
  saveProduct,
  setProductAvailability,
  updateCategory,
  type CatalogCategory,
  type CatalogData,
  type CatalogProduct,
} from '@/lib/catalog/catalogAdapter';

const inputClassName =
  'min-h-[44px] w-full rounded-[12px] border border-border-default bg-bg-surface px-3 py-2 font-body text-base text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50';

interface ProductFormState {
  id: string | null;
  categoryId: string;
  name: string;
  description: string;
  priceCents: string;
  available: boolean;
  active: boolean;
  position: string;
  sku: string;
  version?: number;
}

interface CategoryFormState {
  id: string | null;
  name: string;
  description: string;
  position: string;
  active: boolean;
  version?: number;
}

function emptyProduct(categoryId = ''): ProductFormState {
  return {
    id: null,
    categoryId,
    name: '',
    description: '',
    priceCents: '',
    available: true,
    active: true,
    position: '0',
    sku: '',
  };
}

function emptyCategory(): CategoryFormState {
  return { id: null, name: '', description: '', position: '0', active: true };
}

function LoadingState() {
  return (
    <div role="status" aria-live="polite" className="rounded-[16px] bg-bg-surface p-8 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-action-primary border-t-transparent motion-reduce:animate-none" />
      <p className="mt-4 font-body text-sm text-text-secondary">Carregando catálogo...</p>
    </div>
  );
}

function CatalogErrorState({ error, onRetry }: { error: CatalogError; onRetry: () => void }) {
  const permission = error.kind === 'permission';
  return (
    <section role="alert" className="rounded-[16px] border border-border-default bg-bg-surface p-8">
      <h2 className="font-heading text-xl font-bold text-text-primary">
        {permission
          ? 'Sem permissão para gerenciar este catálogo'
          : 'Não foi possível carregar o catálogo'}
      </h2>
      <p className="mt-2 font-body text-sm text-text-secondary">
        {permission
          ? 'Solicite a permissão catalog.manage a um proprietário ou gerente.'
          : error.message}
      </p>
      <Button type="button" variant="secondary" className="mt-6" onClick={onRetry}>
        Tentar novamente
      </Button>
    </section>
  );
}

function formatPrice(cents: number): string {
  return `${cents.toLocaleString('pt-BR')} centavos`;
}

function categoryLabel(category: CatalogCategory): string {
  return category.active ? category.name : `${category.name} (inativa)`;
}

export function CatalogPage() {
  const fieldId = useId();
  const { organization, unit, refreshToken } = useOrganizationContext();
  const { isOffline } = useOnlineStatus();
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<CatalogError | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategory);
  const [productForm, setProductForm] = useState<ProductFormState>(() => emptyProduct());

  async function reload() {
    if (!organization || !unit) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      setCatalog(await loadCatalog(getSupabaseClient(), organization.id, unit.id));
    } catch (error) {
      setCatalog(null);
      setLoadError(error instanceof CatalogError ? error : new CatalogError('unknown'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    if (!organization || !unit) {
      setCatalog(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    void Promise.resolve()
      .then(() => loadCatalog(getSupabaseClient(), organization.id, unit.id))
      .then((nextCatalog) => {
        if (!cancelled) setCatalog(nextCatalog);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setCatalog(null);
        setLoadError(error instanceof CatalogError ? error : new CatalogError('unknown'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organization, refreshToken, unit]);

  function resetMessages() {
    setMutationError(null);
    setSuccessMessage(null);
  }

  function guardMutation(): boolean {
    resetMessages();
    if (isOffline) {
      setMutationError('Sem conexão. Conecte-se à internet para alterar o catálogo.');
      return false;
    }
    if (!organization || !unit) {
      setMutationError('Nenhuma unidade ativa está selecionada.');
      return false;
    }
    return true;
  }

  async function handleCreateDraft() {
    if (!guardMutation() || !organization || !unit) return;
    setIsSaving(true);
    try {
      await createMenuDraft(getSupabaseClient(), organization.id, unit.id);
      await reload();
      setSuccessMessage('Rascunho pronto para edição.');
    } catch (error) {
      setMutationError(
        error instanceof CatalogError ? error.message : 'Não foi possível criar o rascunho.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guardMutation() || !organization || !unit) return;
    const name = categoryForm.name.trim();
    const position = Number(categoryForm.position);
    if (!name || !Number.isInteger(position) || position < 0) {
      setMutationError('Informe um nome de categoria e uma ordem válida.');
      return;
    }
    setIsSaving(true);
    try {
      if (categoryForm.id && categoryForm.version) {
        await updateCategory(getSupabaseClient(), organization.id, unit.id, categoryForm.id, {
          name,
          description: categoryForm.description.trim() || null,
          position,
          active: categoryForm.active,
          version: categoryForm.version,
        });
      } else {
        await createCategory(getSupabaseClient(), organization.id, unit.id, {
          name,
          description: categoryForm.description.trim() || null,
          position,
        });
      }
      setCategoryForm(emptyCategory());
      await reload();
      setSuccessMessage('Categoria salva no rascunho.');
    } catch (error) {
      setMutationError(
        error instanceof CatalogError ? error.message : 'Não foi possível salvar a categoria.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!guardMutation() || !organization || !unit) return;
    const name = productForm.name.trim();
    const priceCents = Number(productForm.priceCents);
    const position = Number(productForm.position);
    if (
      !name ||
      !Number.isSafeInteger(priceCents) ||
      priceCents < 0 ||
      !Number.isInteger(position) ||
      position < 0
    ) {
      setMutationError('Informe nome, preço em centavos e ordem válidos.');
      return;
    }
    if (!productForm.categoryId) {
      setMutationError('Selecione uma categoria para o produto.');
      return;
    }
    setIsSaving(true);
    try {
      await saveProduct(getSupabaseClient(), organization.id, unit.id, productForm.id, {
        categoryId: productForm.categoryId,
        name,
        description: productForm.description.trim() || null,
        priceCents,
        active: productForm.active,
        available: productForm.available,
        position,
        sku: productForm.sku.trim() || null,
        version: productForm.version,
      });
      setProductForm(emptyProduct(productForm.categoryId));
      await reload();
      setSuccessMessage('Produto salvo no rascunho.');
    } catch (error) {
      setMutationError(
        error instanceof CatalogError ? error.message : 'Não foi possível salvar o produto.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvailability(product: CatalogProduct) {
    if (!guardMutation() || !organization || !unit) return;
    setIsSaving(true);
    try {
      await setProductAvailability(
        getSupabaseClient(),
        organization.id,
        unit.id,
        product,
        !product.available,
      );
      await reload();
      setSuccessMessage('Disponibilidade salva no rascunho.');
    } catch (error) {
      setMutationError(
        error instanceof CatalogError
          ? error.message
          : 'Não foi possível alterar a disponibilidade.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!guardMutation() || !organization || !unit || !catalog) return;
    const draft = catalog.versions.find((version) => version.status === 'draft');
    if (!draft) return;
    if (
      !window.confirm(
        'Publicar este rascunho? A versão publicada atual será preservada no histórico.',
      )
    )
      return;
    setIsPublishing(true);
    try {
      await publishMenuVersion(getSupabaseClient(), organization.id, unit.id, draft.id);
      await reload();
      setSuccessMessage('Cardápio publicado com sucesso.');
    } catch (error) {
      setMutationError(
        error instanceof CatalogError ? error.message : 'Não foi possível publicar o cardápio.',
      );
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleArchive(versionId: string) {
    if (!guardMutation() || !organization || !unit) return;
    setIsSaving(true);
    try {
      await archiveMenuVersion(getSupabaseClient(), organization.id, unit.id, versionId);
      await reload();
      setSuccessMessage('Versão arquivada.');
    } catch (error) {
      setMutationError(
        error instanceof CatalogError ? error.message : 'Não foi possível arquivar a versão.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!unit && !isLoading) {
    return (
      <main className="min-h-screen bg-bg-app px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          <OrganizationContextHeader />
          <section className="mt-8 rounded-[16px] border border-border-default bg-bg-surface p-8 text-center">
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              Nenhuma unidade autorizada
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Selecione uma unidade autorizada para gerenciar o catálogo.
            </p>
          </section>
        </div>
      </main>
    );
  }

  const draft = catalog?.versions.find((version) => version.status === 'draft');
  const published = catalog?.versions.find(
    (version) => version.id === catalog.menu?.current_version_id,
  );
  const canEdit = Boolean(catalog?.menu && draft);

  return (
    <main className="min-h-screen bg-bg-app px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              to="/app"
              className="font-body text-sm font-semibold text-action-primary underline-offset-4 hover:underline"
            >
              Voltar ao painel
            </Link>
            <p className="mt-5 font-body text-sm font-semibold uppercase tracking-wide text-action-primary">
              Catálogo
            </p>
            <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary sm:text-3xl">
              Cardápio da unidade
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Organize categorias e produtos simples. As alterações ficam no rascunho até a
              publicação.
            </p>
          </div>
          <OrganizationContextHeader />
        </header>

        {isOffline && (
          <div
            role="status"
            className="mb-5 rounded-[12px] bg-attention/20 px-4 py-3 text-sm text-text-primary"
          >
            Sem conexão. Você pode consultar o catálogo, mas mutações exigem conexão.
          </div>
        )}
        {mutationError && (
          <div
            role="alert"
            className="mb-5 rounded-[12px] bg-danger/10 px-4 py-3 text-sm text-text-primary"
          >
            {mutationError}
          </div>
        )}
        {successMessage && (
          <div
            role="status"
            className="mb-5 rounded-[12px] bg-success/10 px-4 py-3 text-sm text-text-primary"
          >
            {successMessage}
          </div>
        )}

        {isLoading && <LoadingState />}
        {!isLoading && loadError && (
          <CatalogErrorState error={loadError} onRetry={() => void reload()} />
        )}
        {!isLoading && !loadError && !catalog?.menu && (
          <section className="rounded-[16px] border border-border-default bg-bg-surface p-8 text-center">
            <h2 className="font-heading text-xl font-bold text-text-primary">
              Crie o cardápio da unidade
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-text-secondary">
              O primeiro rascunho será criado para a unidade ativa.
            </p>
            <Button
              type="button"
              className="mt-6"
              onClick={() => void handleCreateDraft()}
              loading={isSaving}
              disabled={isOffline}
            >
              Criar rascunho
            </Button>
          </section>
        )}

        {!isLoading && !loadError && catalog?.menu && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-3" aria-label="Estado do menu">
              <div className="rounded-[16px] bg-bg-surface p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Menu
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <StatusBadge
                    status={catalog.menu.status}
                    label={catalog.menu.status === 'published' ? 'Publicado' : 'Rascunho'}
                  />
                  <span className="text-sm text-text-secondary">v{catalog.menu.version}</span>
                </div>
              </div>
              <div className="rounded-[16px] bg-bg-surface p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Versão publicada
                </p>
                <p className="mt-2 font-heading text-2xl font-bold text-text-primary">
                  {published ? `v${published.version_number}` : 'Nenhuma'}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {published?.checksum
                    ? `Checksum ${published.checksum.slice(0, 12)}...`
                    : 'Publique o primeiro rascunho'}
                </p>
              </div>
              <div className="rounded-[16px] bg-bg-surface p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Rascunho
                </p>
                <p className="mt-2 font-heading text-2xl font-bold text-text-primary">
                  {draft ? `v${draft.version_number}` : 'Nenhum'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleCreateDraft()}
                    loading={isSaving}
                    disabled={isOffline}
                  >
                    Salvar rascunho
                  </Button>
                  {draft && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handlePublish()}
                      loading={isPublishing}
                      disabled={isOffline}
                    >
                      Publicar menu
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {!published && (
              <div
                role="status"
                className="rounded-[12px] border border-attention/40 bg-attention/10 px-4 py-3 text-sm text-text-primary"
              >
                Este menu ainda não tem uma versão publicada. O cliente público verá o cardápio
                somente após a publicação.
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <section
                className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
                aria-labelledby={`${fieldId}-categories`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id={`${fieldId}-categories`}
                      className="font-heading text-lg font-bold text-text-primary"
                    >
                      Categorias
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      Ordene e ative os grupos do cardápio.
                    </p>
                  </div>
                  <span className="text-sm text-text-secondary">{catalog.categories.length}</span>
                </div>
                <div className="mt-5 space-y-2">
                  {catalog.categories.length === 0 && (
                    <p className="rounded-[12px] bg-bg-app p-4 text-sm text-text-secondary">
                      Nenhuma categoria criada.
                    </p>
                  )}
                  {catalog.categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between gap-3 rounded-[12px] border border-border-default p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text-primary">
                          {categoryLabel(category)}
                        </p>
                        <p className="text-xs text-text-secondary">Posição {category.position}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="tertiary"
                        onClick={() =>
                          setCategoryForm({
                            id: category.id,
                            name: category.name,
                            description: category.description ?? '',
                            position: String(category.position),
                            active: category.active,
                            version: category.version,
                          })
                        }
                        disabled={!canEdit || isSaving}
                      >
                        Editar
                      </Button>
                    </div>
                  ))}
                </div>
                <form
                  className="mt-5 border-t border-border-default pt-5"
                  onSubmit={handleCategorySubmit}
                >
                  <h3 className="font-heading text-sm font-bold text-text-primary">
                    {categoryForm.id ? 'Editar categoria' : 'Nova categoria'}
                  </h3>
                  <div className="mt-3 space-y-3">
                    <label className="block text-sm font-semibold text-text-primary">
                      Nome
                      <input
                        className={inputClassName}
                        value={categoryForm.name}
                        onChange={(event) =>
                          setCategoryForm((current) => ({ ...current, name: event.target.value }))
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-text-primary">
                      Descrição opcional
                      <textarea
                        className={`${inputClassName} min-h-20`}
                        value={categoryForm.description}
                        onChange={(event) =>
                          setCategoryForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-text-primary">
                      Ordem
                      <input
                        className={inputClassName}
                        inputMode="numeric"
                        type="number"
                        min="0"
                        value={categoryForm.position}
                        onChange={(event) =>
                          setCategoryForm((current) => ({
                            ...current,
                            position: event.target.value,
                          }))
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold text-text-primary">
                      <input
                        type="checkbox"
                        checked={categoryForm.active}
                        onChange={(event) =>
                          setCategoryForm((current) => ({
                            ...current,
                            active: event.target.checked,
                          }))
                        }
                        disabled={!canEdit || isSaving}
                      />{' '}
                      Categoria ativa
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="submit" loading={isSaving} disabled={!canEdit || isOffline}>
                      {categoryForm.id ? 'Salvar categoria' : 'Criar categoria'}
                    </Button>
                    {categoryForm.id && (
                      <Button
                        type="button"
                        variant="tertiary"
                        onClick={() => setCategoryForm(emptyCategory())}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </section>

              <section
                className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
                aria-labelledby={`${fieldId}-products`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id={`${fieldId}-products`}
                      className="font-heading text-lg font-bold text-text-primary"
                    >
                      Produtos simples
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      Preço em centavos de real e disponibilidade controlada pelo rascunho.
                    </p>
                  </div>
                  <span className="text-sm text-text-secondary">{catalog.products.length}</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {catalog.products.length === 0 && (
                    <p className="rounded-[12px] bg-bg-app p-4 text-sm text-text-secondary sm:col-span-2">
                      Nenhum produto criado.
                    </p>
                  )}
                  {catalog.products.map((product) => (
                    <article
                      key={product.id}
                      className="rounded-[12px] border border-border-default p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-text-primary">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-xs text-text-secondary">
                            {catalog.categories.find(
                              (category) => category.id === product.category_id,
                            )?.name ?? 'Categoria removida'}
                          </p>
                        </div>
                        <StatusBadge
                          status={product.available ? 'confirmed' : 'cancelled'}
                          label={product.available ? 'Disponível' : 'Indisponível'}
                        />
                      </div>
                      <p className="mt-3 text-sm text-text-secondary">
                        {product.description || 'Sem descrição'}
                      </p>
                      <p className="mt-3 font-heading text-lg font-bold text-text-primary">
                        {formatPrice(product.price_cents)}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="tertiary"
                          onClick={() =>
                            setProductForm({
                              id: product.id,
                              categoryId: product.category_id,
                              name: product.name,
                              description: product.description ?? '',
                              priceCents: String(product.price_cents),
                              available: product.available,
                              active: product.active,
                              position: String(product.position),
                              sku: product.sku ?? '',
                              version: product.version,
                            })
                          }
                          disabled={!canEdit || isSaving}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleAvailability(product)}
                          disabled={!canEdit || isSaving || isOffline}
                        >
                          {product.available ? 'Indisponibilizar' : 'Disponibilizar'}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
                <form
                  className="mt-6 border-t border-border-default pt-5"
                  onSubmit={handleProductSubmit}
                >
                  <h3 className="font-heading text-sm font-bold text-text-primary">
                    {productForm.id ? 'Editar produto' : 'Novo produto'}
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-text-primary sm:col-span-2">
                      Nome
                      <input
                        className={inputClassName}
                        value={productForm.name}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, name: event.target.value }))
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-text-primary sm:col-span-2">
                      Descrição opcional
                      <textarea
                        className={`${inputClassName} min-h-20`}
                        value={productForm.description}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-text-primary">
                      Categoria
                      <select
                        className={inputClassName}
                        value={productForm.categoryId}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            categoryId: event.target.value,
                          }))
                        }
                        disabled={!canEdit || isSaving}
                      >
                        {catalog.categories
                          .filter((category) => !category.deleted_at)
                          .map((category) => (
                            <option key={category.id} value={category.id}>
                              {categoryLabel(category)}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="block text-sm font-semibold text-text-primary">
                      Preço em centavos
                      <input
                        className={inputClassName}
                        inputMode="numeric"
                        type="number"
                        min="0"
                        step="1"
                        value={productForm.priceCents}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            priceCents: event.target.value,
                          }))
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-text-primary">
                      Ordem
                      <input
                        className={inputClassName}
                        inputMode="numeric"
                        type="number"
                        min="0"
                        value={productForm.position}
                        onChange={(event) =>
                          setProductForm((current) => ({
                            ...current,
                            position: event.target.value,
                          }))
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                    <label className="block text-sm font-semibold text-text-primary">
                      SKU opcional
                      <input
                        className={inputClassName}
                        value={productForm.sku}
                        onChange={(event) =>
                          setProductForm((current) => ({ ...current, sku: event.target.value }))
                        }
                        disabled={!canEdit || isSaving}
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="submit" loading={isSaving} disabled={!canEdit || isOffline}>
                      {productForm.id ? 'Salvar produto' : 'Criar produto'}
                    </Button>
                    {productForm.id && (
                      <Button
                        type="button"
                        variant="tertiary"
                        onClick={() => setProductForm(emptyProduct())}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </form>
              </section>
            </div>

            <section
              className="rounded-[16px] bg-bg-surface p-5 shadow-sm sm:p-6"
              aria-labelledby={`${fieldId}-history`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2
                    id={`${fieldId}-history`}
                    className="font-heading text-lg font-bold text-text-primary"
                  >
                    Histórico de versões
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    Versões publicadas são imutáveis.
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <caption className="sr-only">Versões do cardápio</caption>
                  <thead className="border-b border-border-default text-xs uppercase tracking-wide text-text-secondary">
                    <tr>
                      <th className="px-3 py-3">Versão</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-3 py-3">Publicada em</th>
                      <th className="px-3 py-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.versions.map((version) => (
                      <tr key={version.id} className="border-b border-border-default last:border-0">
                        <td className="px-3 py-3 font-semibold text-text-primary">
                          v{version.version_number}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge
                            status={version.status}
                            label={
                              version.status === 'published'
                                ? 'Publicada'
                                : version.status === 'draft'
                                  ? 'Rascunho'
                                  : 'Arquivada'
                            }
                          />
                        </td>
                        <td className="px-3 py-3 text-text-secondary">
                          {version.published_at
                            ? new Date(version.published_at).toLocaleString('pt-BR')
                            : '—'}
                        </td>
                        <td className="px-3 py-3">
                          {version.status === 'draft' && (
                            <Button
                              type="button"
                              size="sm"
                              variant="tertiary"
                              onClick={() => void handleArchive(version.id)}
                              disabled={isSaving || isOffline}
                            >
                              Arquivar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
