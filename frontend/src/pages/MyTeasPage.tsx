import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  createMyTea,
  createMyTeaInstruction,
  deleteMyTea,
  deleteMyTeaInstruction,
  getBrewingStyles,
  getMyTeaById,
  getMyTeas,
  getTeaCategories,
  updateMyTea,
  updateMyTeaInstruction,
} from '../services/api';
import type {
  MyTeaDetail,
  MyTeaFormValues,
  MyTeaInstructionFormValues,
  MyTeaSummary,
} from '../interfaces/mytea.interface';

const blankTeaForm: MyTeaFormValues = {
  name: '',
  description: '',
  image_url: '',
  categoryId: 0,
  brew_temp: 80,
};

const blankInstructionForm: MyTeaInstructionFormValues = {
  styleId: 0,
  grams_per_100ml: 4,
  first_infusion_seconds: 30,
  increment_seconds: 5,
  max_infusions: 6,
};

function ModalPortal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-black/25 bg-[#FFFBEF] p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-black">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-sm text-black hover:text-black/70"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function MyTeasPage() {
  const [teas, setTeas] = useState<MyTeaSummary[]>([]);
  const [selectedTeaId, setSelectedTeaId] = useState<number | null>(null);
  const [selectedTea, setSelectedTea] = useState<MyTeaDetail | null>(null);
  const [categories, setCategories] = useState<
    Array<{ id: number; name: string; icon_url: string | null }>
  >([]);
  const [styles, setStyles] = useState<
    Array<{ id: number; name: string; description: string | null }>
  >([]);
  const [createTeaForm, setCreateTeaForm] = useState<MyTeaFormValues>(blankTeaForm);
  const [teaForm, setTeaForm] = useState<MyTeaFormValues>(blankTeaForm);
  const [instructionForm, setInstructionForm] =
    useState<MyTeaInstructionFormValues>(blankInstructionForm);
  const [editingInstructionId, setEditingInstructionId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [teaSaving, setTeaSaving] = useState(false);
  const [instructionSaving, setInstructionSaving] = useState(false);
  const [error, setError] = useState('');

  const [isCreateTeaModalOpen, setIsCreateTeaModalOpen] = useState(false);
  const [isEditTeaModalOpen, setIsEditTeaModalOpen] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);

  const selectedStyle = useMemo(
    () => styles.find((style) => style.id === instructionForm.styleId) ?? null,
    [styles, instructionForm.styleId],
  );

  const loadSelectedTea = async (teaId: number) => {
    const tea = await getMyTeaById(teaId);
    setSelectedTea(tea);
    setTeaForm({
      name: tea.name,
      description: tea.description ?? '',
      image_url: tea.image_url ?? '',
      categoryId: tea.categoryId,
      brew_temp: tea.brew_temp,
    });
    setEditingInstructionId(null);
    setInstructionForm((current) => ({
      ...current,
      styleId: styles[0]?.id ?? current.styleId,
    }));
  };

  const reloadTeas = async (nextSelectedTeaId?: number | null) => {
    const teasData = await getMyTeas();
    setTeas(teasData);

    const resolvedSelectedTeaId =
      nextSelectedTeaId ?? selectedTeaId ?? teasData[0]?.id ?? null;
    setSelectedTeaId(resolvedSelectedTeaId);

    if (resolvedSelectedTeaId) {
      await loadSelectedTea(resolvedSelectedTeaId);
    } else {
      setSelectedTea(null);
      setTeaForm(blankTeaForm);
      setEditingInstructionId(null);
      setInstructionForm((current) => ({
        ...blankInstructionForm,
        styleId: styles[0]?.id ?? current.styleId,
      }));
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const [teasData, categoriesData, stylesData] = await Promise.all([
          getMyTeas(),
          getTeaCategories(),
          getBrewingStyles(),
        ]);

        if (!active) return;

        setTeas(teasData);
        setCategories(categoriesData);
        setStyles(stylesData);

        const initialTeaId = teasData[0]?.id ?? null;
        setSelectedTeaId(initialTeaId);

        if (initialTeaId) {
          const tea = await getMyTeaById(initialTeaId);
          if (!active) return;
          setSelectedTea(tea);
          setTeaForm({
            name: tea.name,
            description: tea.description ?? '',
            image_url: tea.image_url ?? '',
            categoryId: tea.categoryId,
            brew_temp: tea.brew_temp,
          });
        }

        const defaultCategoryId = categoriesData[0]?.id ?? 0;
        const defaultStyleId = stylesData[0]?.id ?? 0;

        setCreateTeaForm((current) => ({
          ...current,
          categoryId: current.categoryId || defaultCategoryId,
        }));

        setTeaForm((current) => ({
          ...current,
          categoryId: current.categoryId || defaultCategoryId,
        }));

        setInstructionForm((current) => ({
          ...current,
          styleId: current.styleId || defaultStyleId,
        }));
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Nie udało się załadować My Teas',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!categories.length) return;

    const defaultCategoryId = categories[0].id;
    setCreateTeaForm((current) => ({
      ...current,
      categoryId: current.categoryId || defaultCategoryId,
    }));
    setTeaForm((current) => ({
      ...current,
      categoryId: current.categoryId || defaultCategoryId,
    }));
  }, [categories]);

  useEffect(() => {
    if (!styles.length) return;

    const defaultStyleId = styles[0].id;
    setInstructionForm((current) => ({
      ...current,
      styleId: current.styleId || defaultStyleId,
    }));
  }, [styles]);

  const handleCreateTea = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createTeaForm.name.trim() || !createTeaForm.categoryId) return;

    try {
      setTeaSaving(true);
      setError('');
      const createdTea = await createMyTea(createTeaForm);
      setCreateTeaForm((current) => ({
        ...blankTeaForm,
        categoryId: current.categoryId || categories[0]?.id || 0,
        brew_temp: current.brew_temp || 80,
      }));
      await reloadTeas(createdTea.id);
      setIsCreateTeaModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nie udało się utworzyć herbaty',
      );
    } finally {
      setTeaSaving(false);
    }
  };

  const handleUpdateTea = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTea) return;

    try {
      setTeaSaving(true);
      setError('');
      const updatedTea = await updateMyTea(selectedTea.id, teaForm);
      setTeas((current) =>
        current.map((tea) => (tea.id === updatedTea.id ? { ...tea, ...updatedTea } : tea)),
      );
      await loadSelectedTea(updatedTea.id);
      setIsEditTeaModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Tea update failed',
      );
    } finally {
      setTeaSaving(false);
    }
  };

  const handleDeleteTea = async () => {
    if (!selectedTea) return;

    const confirmed = window.confirm(`Delete tea ${selectedTea.name}?`);
    if (!confirmed) return;

    try {
      setTeaSaving(true);
      setError('');
      await deleteMyTea(selectedTea.id);

      const remainingTeas = teas.filter((tea) => tea.id !== selectedTea.id);
      setTeas(remainingTeas);

      const nextTeaId = remainingTeas[0]?.id ?? null;
      setSelectedTeaId(nextTeaId);
      if (nextTeaId) {
        await loadSelectedTea(nextTeaId);
      } else {
        setSelectedTea(null);
        setTeaForm(blankTeaForm);
        setEditingInstructionId(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Tea delete failed',
      );
    } finally {
      setTeaSaving(false);
    }
  };

  const handleInstructionSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!selectedTea || !instructionForm.styleId) return;

    try {
      setInstructionSaving(true);
      setError('');

      if (editingInstructionId) {
        await updateMyTeaInstruction(
          selectedTea.id,
          editingInstructionId,
          instructionForm,
        );
      } else {
        await createMyTeaInstruction(selectedTea.id, instructionForm);
      }

      setEditingInstructionId(null);
      setInstructionForm((current) => ({
        ...blankInstructionForm,
        styleId: current.styleId || styles[0]?.id || 0,
      }));
      await loadSelectedTea(selectedTea.id);
      setIsInstructionModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Instruction save failed',
      );
    } finally {
      setInstructionSaving(false);
    }
  };

  const handleInstructionEdit = (instructionId: number) => {
    if (!selectedTea) return;

    const instruction = selectedTea.instructions.find((item) => item.id === instructionId);
    if (!instruction) return;

    setEditingInstructionId(instruction.id);
    setInstructionForm({
      styleId: instruction.styleId,
      grams_per_100ml: instruction.grams_per_100ml,
      first_infusion_seconds: instruction.first_infusion_seconds,
      increment_seconds: instruction.increment_seconds,
      max_infusions: instruction.max_infusions,
    });
    setIsInstructionModalOpen(true);
  };

  const handleInstructionDelete = async (instructionId: number) => {
    if (!selectedTea) return;

    const confirmed = window.confirm('Delete this brewing instruction?');
    if (!confirmed) return;

    try {
      setInstructionSaving(true);
      setError('');
      await deleteMyTeaInstruction(selectedTea.id, instructionId);
      await loadSelectedTea(selectedTea.id);
      setEditingInstructionId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Instruction delete failed',
      );
    } finally {
      setInstructionSaving(false);
    }
  };

  return (
    <>
      <main className="min-h-app">
        <div className="mx-auto flex w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
          <div className="mb-5 flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <h1 className="mt-1 text-3xl font-bold text-black">Tea List</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateTeaModalOpen(true)}
                className="rounded-full  px-4 py-2 text-sm font-medium bg-[#51961f] text-[#FFFBEF] hover:bg-[#51961f]/90"
              >
                Add Tea
              </button>
            </div>
          </div>

          {error ? (
            <p className="mb-5 rounded-2xl px-4 py-3 text-sm text-black">
              {error}
            </p>
          ) : null}

          <section className="px-5">
            <div className="mb-4 flex items-end justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.35em] text-black/50">Your Teas</p>
              <span className="text-sm text-black/50">{teas.length} items</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-2xl border border-black/10 bg-black/5"
                  />
                ))}
              </div>
            ) : teas.length ? (
              <div >
                {teas.map((tea) => {
                  return (
                    <div
                      key={tea.id}
                      className="border-b p-4 border-black/25"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={async () => {
                            setSelectedTeaId(tea.id);
                            setError('');
                            try {
                              await loadSelectedTea(tea.id);
                            } catch (err) {
                              setError(
                                err instanceof Error
                                  ? err.message
                                  : 'Failed to open tea',
                              );
                            }
                          }}
                          className="text-left"
                        >
                          <h3 className="text-lg font-semibold text-black">{tea.name}</h3>
                          <p className="mt-1 text-sm text-black/60">
                            {tea.category.name} · {tea.brew_temp}°C
                          </p>
                        </button>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/tea/user/${tea.id}`}
                            className="rounded-full border border-black/25 px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5"
                          >
                            Go To
                          </Link>
                          <button
                            type="button"
                            onClick={async () => {
                              setSelectedTeaId(tea.id);
                              await loadSelectedTea(tea.id);
                              setIsEditTeaModalOpen(true);
                            }}
                            className="rounded-full border border-black/25 px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setSelectedTeaId(tea.id);
                              await loadSelectedTea(tea.id);
                              setEditingInstructionId(null);
                              setInstructionForm((current) => ({
                                ...blankInstructionForm,
                                styleId: current.styleId || styles[0]?.id || 0,
                              }));
                              setIsInstructionModalOpen(true);
                            }}
                            className="rounded-full border border-black/25 px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5"
                          >
                            Instructions
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setSelectedTeaId(tea.id);
                              await loadSelectedTea(tea.id);
                              await handleDeleteTea();
                            }}
                            disabled={teaSaving}
                            className="rounded-full border border-black/25 px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-sm text-black/60">
                You have no teas yet. Add the first one.
              </div>
            )}
          </section>
        </div>
      </main>

      <ModalPortal
        open={isCreateTeaModalOpen}
        title="Add New Tea"
        onClose={() => setIsCreateTeaModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleCreateTea}>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
              Name
            </label>
            <input
              value={createTeaForm.name}
              onChange={(event) =>
                setCreateTeaForm((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
              placeholder="My Sencha"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
              Description
            </label>
            <textarea
              value={createTeaForm.description}
              onChange={(event) =>
                setCreateTeaForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="min-h-28 w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
              placeholder="Short note about this tea"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                Category
              </label>
              <select
                value={createTeaForm.categoryId}
                onChange={(event) =>
                  setCreateTeaForm((current) => ({
                    ...current,
                    categoryId: Number(event.target.value),
                  }))
                }
                className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
              >
                <option value={0}>Choose category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                Brew temp
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={createTeaForm.brew_temp}
                onChange={(event) =>
                  setCreateTeaForm((current) => ({
                    ...current,
                    brew_temp: Number(event.target.value),
                  }))
                }
                className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
              Image URL
            </label>
            <input
              value={createTeaForm.image_url}
              onChange={(event) =>
                setCreateTeaForm((current) => ({ ...current, image_url: event.target.value }))
              }
              className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={teaSaving}
              className="rounded-full px-5 py-2.5 text-sm font-medium text-[#FFFBEF] bg-[#51961f] hover:bg-[#51961f]/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {teaSaving ? 'Saving...' : 'Create tea'}
            </button>
          </div>
        </form>
      </ModalPortal>

      <ModalPortal
        open={isEditTeaModalOpen}
        title={selectedTea ? `Edit: ${selectedTea.name}` : 'Edit Tea'}
        onClose={() => setIsEditTeaModalOpen(false)}
      >
        {selectedTea ? (
          <form className="space-y-4" onSubmit={handleUpdateTea}>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                Name
              </label>
              <input
                value={teaForm.name}
                onChange={(event) =>
                  setTeaForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                Description
              </label>
              <textarea
                value={teaForm.description}
                onChange={(event) =>
                  setTeaForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="min-h-28 w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                  Category
                </label>
                <select
                  value={teaForm.categoryId}
                  onChange={(event) =>
                    setTeaForm((current) => ({
                      ...current,
                      categoryId: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                  Brew temp
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={teaForm.brew_temp}
                  onChange={(event) =>
                    setTeaForm((current) => ({
                      ...current,
                      brew_temp: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                Image URL
              </label>
              <input
                value={teaForm.image_url}
                onChange={(event) =>
                  setTeaForm((current) => ({ ...current, image_url: event.target.value }))
                }
                className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={teaSaving}
                className="rounded-full px-5 py-2.5 text-sm font-medium text-[#FFFBEF] bg-[#51961f] hover:bg-[#51961f]/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {teaSaving ? 'Saving...' : 'Save tea'}
              </button>
            </div>
          </form>
        ) : null}
      </ModalPortal>

      <ModalPortal
        open={isInstructionModalOpen}
        title={editingInstructionId ? 'Edit Instruction' : 'Add Instruction'}
        onClose={() => {
          setIsInstructionModalOpen(false);
          setEditingInstructionId(null);
        }}
      >
        {selectedTea ? (
          <div className="space-y-4">
            <form className="space-y-4" onSubmit={handleInstructionSubmit}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                    Style
                  </label>
                  <select
                    value={instructionForm.styleId}
                    onChange={(event) =>
                      setInstructionForm((current) => ({
                        ...current,
                        styleId: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
                  >
                    <option value={0}>Choose style</option>
                    {styles.map((style) => (
                      <option key={style.id} value={style.id}>
                        {style.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                    Grams / 100ml
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={instructionForm.grams_per_100ml}
                    onChange={(event) =>
                      setInstructionForm((current) => ({
                        ...current,
                        grams_per_100ml: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                    First infusion
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={instructionForm.first_infusion_seconds}
                    onChange={(event) =>
                      setInstructionForm((current) => ({
                        ...current,
                        first_infusion_seconds: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                    Increment
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={instructionForm.increment_seconds}
                    onChange={(event) =>
                      setInstructionForm((current) => ({
                        ...current,
                        increment_seconds: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/50">
                  Max infusions
                </label>
                <input
                  type="number"
                  min="1"
                  value={instructionForm.max_infusions}
                  onChange={(event) =>
                    setInstructionForm((current) => ({
                      ...current,
                      max_infusions: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded border border-black/25 bg-white px-4 py-3 text-sm outline-none focus:border-black/50"
                />
              </div>

              {selectedStyle ? (
                <p className="text-xs text-black/50">
                  Selected style: <span className="font-medium text-black">{selectedStyle.name}</span>
                  {selectedStyle.description ? ` · ${selectedStyle.description}` : ''}
                </p>
              ) : null}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={instructionSaving}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-[#FFFBEF] bg-[#51961f] hover:bg-[#51961f]/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {instructionSaving
                    ? 'Saving...'
                    : editingInstructionId
                      ? 'Update recipe'
                      : 'Add recipe'}
                </button>
              </div>
            </form>

            <div className="space-y-3 border-t border-black/10 pt-4">
              <p className="text-xs uppercase tracking-[0.15em] text-black/50">Existing Instructions</p>
              {selectedTea.instructions.length ? (
                selectedTea.instructions.map((instruction) => (
                  <div key={instruction.id} className="rounded-xl border border-black/10 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-black">{instruction.style.name}</p>
                        <p className="text-xs text-black/60">
                          {instruction.grams_per_100ml}g/100ml · {instruction.first_infusion_seconds}s · +
                          {instruction.increment_seconds}s · {instruction.max_infusions} infusions
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleInstructionEdit(instruction.id)}
                          className="rounded-full border border-black/25 px-3 py-1 text-xs font-medium text-black hover:bg-black/5"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInstructionDelete(instruction.id)}
                          className="rounded-full border border-black/25 px-3 py-1 text-xs font-medium text-black hover:bg-black/5"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-black/10 bg-black/5 p-3 text-sm text-black/60">
                    No instructions yet. Add the first one.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </ModalPortal>
    </>
  );
}
