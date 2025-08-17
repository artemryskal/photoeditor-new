import { useAtom } from '@reatom/npm-react';
import { useCallback } from 'react';
import { layersStateAtom } from '../stores/canvas';
import type { Layer, AlphaChannel } from '../types/CanvasTypes';

export interface LayersActions {
  addLayer: (layer: Omit<Layer, 'id'>) => void;
  removeLayer: (layerId: string) => void;
  setActiveLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  addAlphaChannel: (alphaChannel: Omit<AlphaChannel, 'id'>) => void;
  removeAlphaChannel: (channelId: string) => void;
  updateAlphaChannel: (channelId: string, updates: Partial<AlphaChannel>) => void;
  clearAllLayers: () => void;
}

export const useLayersActions = (): LayersActions => {
  const [, setLayersState] = useAtom(layersStateAtom);

  const addLayer = useCallback(
    (layer: Omit<Layer, 'id'>) => {
      setLayersState((prevState) => {
        // Проверяем лимит слоев перед добавлением
        if (prevState.layers.length >= prevState.maxLayers) {
          console.warn('Максимальное количество слоев достигнуто');
          return prevState;
        }

        const newLayer: Layer = {
          ...layer,
          id: Date.now().toString() + Math.random().toString(36),
          isActive: false,
        };

        // Деактивируем все слои
        const updatedLayers = prevState.layers.map((l) => ({ ...l, isActive: false }));

        return {
          ...prevState,
          layers: [...updatedLayers, newLayer],
          activeLayerId: newLayer.id,
        };
      });
    },
    [setLayersState],
  );

  const removeLayer = useCallback(
    (layerId: string) => {
      setLayersState((prevState) => {
        const updatedLayers = prevState.layers.filter((l) => l.id !== layerId);

        return {
          ...prevState,
          layers: updatedLayers,
          activeLayerId: updatedLayers.length > 0 ? updatedLayers[0].id : null,
        };
      });
    },
    [setLayersState],
  );

  const setActiveLayer = useCallback(
    (layerId: string) => {
      setLayersState((prevState) => {
        const updatedLayers = prevState.layers.map((l) => ({
          ...l,
          isActive: l.id === layerId,
        }));

        return {
          ...prevState,
          layers: updatedLayers,
          activeLayerId: layerId,
        };
      });
    },
    [setLayersState],
  );

  const updateLayer = useCallback(
    (layerId: string, updates: Partial<Layer>) => {
      setLayersState((prevState) => {
        const updatedLayers = prevState.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l));

        return {
          ...prevState,
          layers: updatedLayers,
        };
      });
    },
    [setLayersState],
  );

  const reorderLayers = useCallback(
    (fromIndex: number, toIndex: number) => {
      setLayersState((prevState) => {
        const layers = [...prevState.layers];
        const [movedLayer] = layers.splice(fromIndex, 1);
        layers.splice(toIndex, 0, movedLayer);

        return {
          ...prevState,
          layers,
        };
      });
    },
    [setLayersState],
  );

  const addAlphaChannel = useCallback(
    (alphaChannel: Omit<AlphaChannel, 'id'>) => {
      setLayersState((prevState) => {
        const newAlphaChannel: AlphaChannel = {
          ...alphaChannel,
          id: Date.now().toString(),
        };

        return {
          ...prevState,
          alphaChannels: [...prevState.alphaChannels, newAlphaChannel],
        };
      });
    },
    [setLayersState],
  );

  const removeAlphaChannel = useCallback(
    (channelId: string) => {
      setLayersState((prevState) => ({
        ...prevState,
        alphaChannels: prevState.alphaChannels.filter((c) => c.id !== channelId),
      }));
    },
    [setLayersState],
  );

  const updateAlphaChannel = useCallback(
    (channelId: string, updates: Partial<AlphaChannel>) => {
      setLayersState((prevState) => {
        const updatedChannels = prevState.alphaChannels.map((c) => (c.id === channelId ? { ...c, ...updates } : c));

        return {
          ...prevState,
          alphaChannels: updatedChannels,
        };
      });
    },
    [setLayersState],
  );

  const clearAllLayers = useCallback(() => {
    setLayersState({
      layers: [],
      alphaChannels: [],
      activeLayerId: null,
      maxLayers: 2,
    });
  }, [setLayersState]);

  return {
    addLayer,
    removeLayer,
    setActiveLayer,
    updateLayer,
    reorderLayers,
    addAlphaChannel,
    removeAlphaChannel,
    updateAlphaChannel,
    clearAllLayers,
  };
};
