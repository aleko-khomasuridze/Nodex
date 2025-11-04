import { useEffect, useState } from "react";

import type { RegisteredDevice } from "../types/device";

interface DeviceRecordState {
  device: RegisteredDevice | null;
  isLoading: boolean;
  error: string | null;
}

const INITIAL_STATE: DeviceRecordState = {
  device: null,
  isLoading: false,
  error: null,
};

/**
 * Load a registered device record from the preload bridge when an identifier is provided.
 * Falls back to `null` and resets the loading state when an id is not present.
 */
const useDeviceRecord = (id?: string | null) => {
  const [{ device, isLoading, error }, setState] =
    useState<DeviceRecordState>(INITIAL_STATE);

  useEffect(() => {
    if (!id) {
      setState({ device: null, isLoading: false, error: null });
      return;
    }

    const loadDevice = async () => {
      if (!window.devices?.get) {
        setState({
          device: null,
          isLoading: false,
          error: "Device lookup is only available in the Electron application.",
        });
        return;
      }

      setState((current) => ({ ...current, isLoading: true, error: null }));

      try {
        const record = await window.devices.get(id);
        setState({ device: record, isLoading: false, error: null });
      } catch (loadError) {
        setState({
          device: null,
          isLoading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the requested device.",
        });
      }
    };

    void loadDevice();
  }, [id]);

  return { device, isLoading, error };
};

export default useDeviceRecord;
