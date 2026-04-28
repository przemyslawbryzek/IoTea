import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from 'twrnc';
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
} from '../services/interfaces/mytea.interface';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSwipeBack } from '../hooks/useSwipeBack';
import { theme } from '../styles/theme';

type RecipesScreenProps = {
  navigation: any;
};

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

function ModalCard({
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
  if (!open) return null;

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
        <View style={tw`mb-4 flex-row items-center justify-between gap-3`}>
          <Text style={tw`text-lg font-semibold text-black`}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={tw`text-base text-black/60`}>✕</Text>
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </View>
  );
}

export default function RecipesScreen({ navigation }: RecipesScreenProps) {
  const { panHandlers } = useSwipeBack(() => navigation.goBack());
  const [teas, setTeas] = useState<MyTeaSummary[]>([]);
  const [selectedTeaId, setSelectedTeaId] = useState<number | null>(null);
  const [selectedTea, setSelectedTea] = useState<MyTeaDetail | null>(null);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; icon_url: string | null }>>([]);
  const [styles, setStyles] = useState<Array<{ id: number; name: string; description: string | null }>>([]);
  const [createTeaForm, setCreateTeaForm] = useState<MyTeaFormValues>(blankTeaForm);
  const [teaForm, setTeaForm] = useState<MyTeaFormValues>(blankTeaForm);
  const [instructionForm, setInstructionForm] = useState<MyTeaInstructionFormValues>(blankInstructionForm);
  const [editingInstructionId, setEditingInstructionId] = useState<number | null>(null);
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

    const resolvedSelectedTeaId = nextSelectedTeaId ?? selectedTeaId ?? teasData[0]?.id ?? null;
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
        setError(err instanceof Error ? err.message : 'Nie udało się załadować My Teas');
      } finally {
        if (active) setLoading(false);
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

  const handleCreateTea = async () => {
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
      setError(err instanceof Error ? err.message : 'Nie udało się utworzyć herbaty');
    } finally {
      setTeaSaving(false);
    }
  };

  const handleUpdateTea = async () => {
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
      setError(err instanceof Error ? err.message : 'Tea update failed');
    } finally {
      setTeaSaving(false);
    }
  };

  const confirmDeleteTea = (teaName: string) =>
    new Promise<boolean>((resolve) => {
      Alert.alert('Delete tea', `Delete tea ${teaName}?`, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });

  const handleDeleteTea = async () => {
    if (!selectedTea) return;

    const confirmed = await confirmDeleteTea(selectedTea.name);
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
      setError(err instanceof Error ? err.message : 'Tea delete failed');
    } finally {
      setTeaSaving(false);
    }
  };

  const handleInstructionSubmit = async () => {
    if (!selectedTea || !instructionForm.styleId) return;

    try {
      setInstructionSaving(true);
      setError('');

      if (editingInstructionId) {
        await updateMyTeaInstruction(selectedTea.id, editingInstructionId, instructionForm);
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
      setError(err instanceof Error ? err.message : 'Instruction save failed');
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

  const confirmDeleteInstruction = () =>
    new Promise<boolean>((resolve) => {
      Alert.alert('Delete instruction', 'Delete this brewing instruction?', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });

  const handleInstructionDelete = async (instructionId: number) => {
    if (!selectedTea) return;

    const confirmed = await confirmDeleteInstruction();
    if (!confirmed) return;

    try {
      setInstructionSaving(true);
      setError('');
      await deleteMyTeaInstruction(selectedTea.id, instructionId);
      await loadSelectedTea(selectedTea.id);
      setEditingInstructionId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Instruction delete failed');
    } finally {
      setInstructionSaving(false);
    }
  };

  const refreshAction = useCallback(async () => {
    setError('');
    const [teasData, categoriesData, stylesData] = await Promise.all([
      getMyTeas(),
      getTeaCategories(),
      getBrewingStyles(),
    ]);

    setTeas(teasData);
    setCategories(categoriesData);
    setStyles(stylesData);

    const resolvedSelectedTeaId = selectedTeaId ?? teasData[0]?.id ?? null;
    setSelectedTeaId(resolvedSelectedTeaId);

    if (resolvedSelectedTeaId) {
      const tea = await getMyTeaById(resolvedSelectedTeaId);
      setSelectedTea(tea);
      setTeaForm({
        name: tea.name,
        description: tea.description ?? '',
        image_url: tea.image_url ?? '',
        categoryId: tea.categoryId,
        brew_temp: tea.brew_temp,
      });
    } else {
      setSelectedTea(null);
      setTeaForm(blankTeaForm);
      setEditingInstructionId(null);
    }
  }, [selectedTeaId]);

  const { refreshControl } = usePullToRefresh(async () => {
    try {
      await refreshAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się załadować My Teas');
    }
  });

  const labelStyle = { letterSpacing: 2.8 };
  const fieldLabelStyle = { letterSpacing: 2.2 };

  return (
    <SafeAreaView style={tw`flex-1`} {...panHandlers}>
      <ScrollView
        style={[tw`flex-1`, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={tw`pb-10`}
        refreshControl={refreshControl}
      >
        <View style={tw`px-5 pt-4`}>
          <View style={tw`flex-row items-center justify-between gap-3`}>
            <View>
              <Text style={tw`text-2xl font-bold text-black`}>My Recipes</Text>
              <Text style={tw`mt-1 text-sm text-black/60`}>Manage your custom teas</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsCreateTeaModalOpen(true)}
              style={tw`rounded-full bg-[#51961f] px-4 py-2`}
            >
              <Text style={tw`text-sm font-medium text-[#FFFBEF]`}>Add Tea</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={tw`mt-4 rounded-2xl border border-black/10 bg-black/5 px-4 py-3`}>
              <Text style={tw`text-sm text-black`}>{error}</Text>
            </View>
          ) : null}

          <View style={tw`mt-6`}>
            <View style={tw`flex-row items-end justify-between`}>
              <Text style={[tw`text-xs uppercase text-black/50`, labelStyle]}>Your Teas</Text>
              <Text style={tw`text-sm text-black/50`}>{teas.length} items</Text>
            </View>

            {loading ? (
              <View style={tw`mt-4 gap-3`}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <View key={index} style={tw`h-20 rounded-2xl border border-black/10 bg-black/5`} />
                ))}
              </View>
            ) : teas.length ? (
              <View style={tw`mt-3 gap-3`}>
                {teas.map((tea) => (
                  <View key={tea.id} style={tw`rounded-2xl border border-black/10 bg-white p-4`}>
                    <Pressable
                      onPress={async () => {
                        setSelectedTeaId(tea.id);
                        setError('');
                        try {
                          await loadSelectedTea(tea.id);
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to open tea');
                        }
                      }}
                    >
                      <Text style={tw`text-lg font-semibold text-black`}>{tea.name}</Text>
                      <Text style={tw`mt-1 text-sm text-black/60`}>
                        {tea.category.name} · {tea.brew_temp}°C
                      </Text>
                    </Pressable>

                    <View style={tw`mt-3 flex-row flex-wrap gap-2`}>
                      <TouchableOpacity
                        onPress={() => navigation.navigate('TeaDetails', { id: tea.id, source: 'user' })}
                        style={tw`rounded-full border border-black/20 px-3 py-1.5`}
                      >
                        <Text style={tw`text-xs font-medium text-black`}>Go To</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          setSelectedTeaId(tea.id);
                          await loadSelectedTea(tea.id);
                          setIsEditTeaModalOpen(true);
                        }}
                        style={tw`rounded-full border border-black/20 px-3 py-1.5`}
                      >
                        <Text style={tw`text-xs font-medium text-black`}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          setSelectedTeaId(tea.id);
                          await loadSelectedTea(tea.id);
                          setEditingInstructionId(null);
                          setInstructionForm((current) => ({
                            ...blankInstructionForm,
                            styleId: current.styleId || styles[0]?.id || 0,
                          }));
                          setIsInstructionModalOpen(true);
                        }}
                        style={tw`rounded-full border border-black/20 px-3 py-1.5`}
                      >
                        <Text style={tw`text-xs font-medium text-black`}>Instructions</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          setSelectedTeaId(tea.id);
                          await loadSelectedTea(tea.id);
                          await handleDeleteTea();
                        }}
                        disabled={teaSaving}
                        style={tw`rounded-full border border-black/20 px-3 py-1.5`}
                      >
                        <Text style={tw`text-xs font-medium text-black`}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={tw`mt-4 rounded-2xl border border-black/10 bg-black/5 p-4`}>
                <Text style={tw`text-sm text-black/60`}>You have no teas yet. Add the first one.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <ModalCard open={isCreateTeaModalOpen} title="Add New Tea" onClose={() => setIsCreateTeaModalOpen(false)}>
        <ScrollView contentContainerStyle={tw`gap-4`}>
          <View>
            <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Name</Text>
            <TextInput
              value={createTeaForm.name}
              onChangeText={(value) => setCreateTeaForm((current) => ({ ...current, name: value }))}
              placeholder="My Sencha"
              style={tw`rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
            />
          </View>

          <View>
            <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Description</Text>
            <TextInput
              value={createTeaForm.description}
              onChangeText={(value) => setCreateTeaForm((current) => ({ ...current, description: value }))}
              placeholder="Short note about this tea"
              multiline
              style={tw`min-h-[96px] rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
            />
          </View>

          <View>
            <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 pr-2`}>
              {categories.map((category) => {
                const isActive = createTeaForm.categoryId === category.id;
                return (
                  <Pressable
                    key={category.id}
                    onPress={() => setCreateTeaForm((current) => ({ ...current, categoryId: category.id }))}
                    style={[
                      tw`rounded-full border px-4 py-2`,
                      { backgroundColor: isActive ? '#eee' : '#fff', borderColor: isActive ? 'grey' : '#ead9c8' },
                    ]}
                  >
                    <Text style={tw`text-sm font-medium`}>{category.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={tw`flex-row gap-3`}>
            <View style={tw`flex-1`}>
              <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Brew temp</Text>
              <TextInput
                value={String(createTeaForm.brew_temp)}
                onChangeText={(value) =>
                  setCreateTeaForm((current) => ({ ...current, brew_temp: Number(value || '0') }))
                }
                keyboardType="number-pad"
                style={tw`rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
              />
            </View>
            <View style={tw`flex-1`}>
              <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Image URL</Text>
              <TextInput
                value={createTeaForm.image_url}
                onChangeText={(value) => setCreateTeaForm((current) => ({ ...current, image_url: value }))}
                placeholder="https://..."
                style={tw`rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
              />
            </View>
          </View>

          <View style={tw`items-end`}>
            <TouchableOpacity
              onPress={handleCreateTea}
              disabled={teaSaving}
              style={tw`rounded-full bg-[#51961f] px-5 py-2.5`}
            >
              <Text style={tw`text-sm font-medium text-[#FFFBEF]`}>{teaSaving ? 'Saving...' : 'Create tea'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ModalCard>

      <ModalCard
        open={isEditTeaModalOpen}
        title={selectedTea ? `Edit: ${selectedTea.name}` : 'Edit Tea'}
        onClose={() => setIsEditTeaModalOpen(false)}
      >
        {selectedTea ? (
          <ScrollView contentContainerStyle={tw`gap-4`}>
            <View>
              <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Name</Text>
              <TextInput
                value={teaForm.name}
                onChangeText={(value) => setTeaForm((current) => ({ ...current, name: value }))}
                style={tw`rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
              />
            </View>

            <View>
              <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Description</Text>
              <TextInput
                value={teaForm.description}
                onChangeText={(value) => setTeaForm((current) => ({ ...current, description: value }))}
                multiline
                style={tw`min-h-[96px] rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
              />
            </View>

            <View>
              <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 pr-2`}>
                {categories.map((category) => {
                  const isActive = teaForm.categoryId === category.id;
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => setTeaForm((current) => ({ ...current, categoryId: category.id }))}
                      style={[
                        tw`rounded-full border px-4 py-2`,
                        { backgroundColor: isActive ? '#eee' : '#fff', borderColor: isActive ? 'grey' : '#ead9c8' },
                      ]}
                    >
                      <Text style={tw`text-sm font-medium`}>{category.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={tw`flex-row gap-3`}>
              <View style={tw`flex-1`}>
                <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Brew temp</Text>
                <TextInput
                  value={String(teaForm.brew_temp)}
                  onChangeText={(value) => setTeaForm((current) => ({ ...current, brew_temp: Number(value || '0') }))}
                  keyboardType="number-pad"
                  style={tw`rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
                />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Image URL</Text>
                <TextInput
                  value={teaForm.image_url}
                  onChangeText={(value) => setTeaForm((current) => ({ ...current, image_url: value }))}
                  style={tw`rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
                />
              </View>
            </View>

            <View style={tw`items-end`}>
              <TouchableOpacity
                onPress={handleUpdateTea}
                disabled={teaSaving}
                style={tw`rounded-full bg-[#51961f] px-5 py-2.5`}
              >
                <Text style={tw`text-sm font-medium text-[#FFFBEF]`}>{teaSaving ? 'Saving...' : 'Save tea'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : null}
      </ModalCard>

      <ModalCard
        open={isInstructionModalOpen}
        title={editingInstructionId ? 'Edit Instruction' : 'Add Instruction'}
        onClose={() => {
          setIsInstructionModalOpen(false);
          setEditingInstructionId(null);
        }}
      >
        {selectedTea ? (
          <ScrollView contentContainerStyle={tw`gap-4`}>
            <View>
              <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Style</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 pr-2`}>
                {styles.map((style) => {
                  const isActive = instructionForm.styleId === style.id;
                  return (
                    <Pressable
                      key={style.id}
                      onPress={() => setInstructionForm((current) => ({ ...current, styleId: style.id }))}
                      style={[
                        tw`rounded-full border px-4 py-2`,
                        { backgroundColor: isActive ? '#eee' : '#fff', borderColor: isActive ? 'grey' : '#ead9c8' },
                      ]}
                    >
                      <Text style={tw`text-sm font-medium`}>{style.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={tw`flex-row gap-3`}>
              <View style={tw`flex-1`}>
                <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Grams / 100ml</Text>
                <TextInput
                  value={String(instructionForm.grams_per_100ml)}
                  onChangeText={(value) =>
                    setInstructionForm((current) => ({ ...current, grams_per_100ml: Number(value || '0') }))
                  }
                  keyboardType="decimal-pad"
                  style={tw`rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
                />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>First infusion</Text>
                <TextInput
                  value={String(instructionForm.first_infusion_seconds)}
                  onChangeText={(value) =>
                    setInstructionForm((current) => ({ ...current, first_infusion_seconds: Number(value || '0') }))
                  }
                  keyboardType="number-pad"
                  style={tw`rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
                />
              </View>
            </View>

            <View style={tw`flex-row gap-3`}>
              <View style={tw`flex-1`}>
                <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Increment</Text>
                <TextInput
                  value={String(instructionForm.increment_seconds)}
                  onChangeText={(value) =>
                    setInstructionForm((current) => ({ ...current, increment_seconds: Number(value || '0') }))
                  }
                  keyboardType="number-pad"
                  style={tw`rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
                />
              </View>
              <View style={tw`flex-1`}>
                <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Max infusions</Text>
                <TextInput
                  value={String(instructionForm.max_infusions)}
                  onChangeText={(value) =>
                    setInstructionForm((current) => ({ ...current, max_infusions: Number(value || '0') }))
                  }
                  keyboardType="number-pad"
                  style={tw`rounded border border-black/25 bg-white px-4 py-3 text-sm text-black`}
                />
              </View>
            </View>

            {selectedStyle ? (
              <Text style={tw`text-xs text-black/60`}>
                Selected style: <Text style={tw`font-medium text-black`}>{selectedStyle.name}</Text>
                {selectedStyle.description ? ` · ${selectedStyle.description}` : ''}
              </Text>
            ) : null}

            <View style={tw`items-end`}>
              <TouchableOpacity
                onPress={handleInstructionSubmit}
                disabled={instructionSaving}
                style={tw`rounded-full bg-[#51961f] px-5 py-2.5`}
              >
                <Text style={tw`text-sm font-medium text-[#FFFBEF]`}>
                  {instructionSaving ? 'Saving...' : editingInstructionId ? 'Update recipe' : 'Add recipe'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={tw`border-t border-black/10 pt-4`}>
              <Text style={[tw`mb-2 text-xs uppercase text-black/50`, fieldLabelStyle]}>Existing Instructions</Text>
              {selectedTea.instructions.length ? (
                <View style={tw`gap-3`}>
                  {selectedTea.instructions.map((instruction) => (
                    <View key={instruction.id} style={tw`rounded-xl border border-black/10 bg-white p-3`}>
                      <View style={tw`flex-row items-start justify-between gap-2`}>
                        <View style={tw`flex-1`}>
                          <Text style={tw`font-medium text-black`}>{instruction.style.name}</Text>
                          <Text style={tw`mt-1 text-xs text-black/60`}>
                            {instruction.grams_per_100ml}g/100ml · {instruction.first_infusion_seconds}s · +
                            {instruction.increment_seconds}s · {instruction.max_infusions} infusions
                          </Text>
                        </View>
                        <View style={tw`flex-row gap-2`}>
                          <TouchableOpacity
                            onPress={() => handleInstructionEdit(instruction.id)}
                            style={tw`rounded-full border border-black/20 px-3 py-1`}
                          >
                            <Text style={tw`text-xs font-medium text-black`}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleInstructionDelete(instruction.id)}
                            style={tw`rounded-full border border-black/20 px-3 py-1`}
                          >
                            <Text style={tw`text-xs font-medium text-black`}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={tw`rounded-xl border border-black/10 bg-black/5 p-3`}>
                  <Text style={tw`text-sm text-black/60`}>No instructions yet. Add the first one.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : null}
      </ModalCard>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    backgroundColor: '#FFFBEF',
    padding: 20,
  },
});
