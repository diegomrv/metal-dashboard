import { useQuery } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import {
	fetchAllExerciseTemplates,
	fetchAllRoutines,
	fetchAllWorkouts,
	fetchWorkoutCount,
} from "./api";
import { getRecentPRs, getStoredData } from "./sync";

const API_KEY_STORAGE_KEY = "hevy-api-key";

function getApiKey(): string | null {
	if (typeof window === "undefined") return null;
	return sessionStorage.getItem(API_KEY_STORAGE_KEY);
}

function setApiKey(key: string) {
	sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
}

function clearApiKey() {
	sessionStorage.removeItem(API_KEY_STORAGE_KEY);
}

// Simple external store for sessionStorage so React re-renders on change
let listeners: Array<() => void> = [];
function subscribe(cb: () => void) {
	listeners.push(cb);
	return () => {
		listeners = listeners.filter((l) => l !== cb);
	};
}

function emitApiKeyChange() {
	for (const l of listeners) l();
}

export function useApiKey() {
	const key = useSyncExternalStore(subscribe, getApiKey, () => null);

	const set = useCallback((newKey: string) => {
		setApiKey(newKey);
		emitApiKeyChange();
	}, []);

	const clear = useCallback(() => {
		clearApiKey();
		emitApiKeyChange();
	}, []);

	return { apiKey: key, setApiKey: set, clearApiKey: clear };
}

export function useStoredHevyData(userId: string | null) {
	const query = useQuery({
		queryKey: ["hevy", "stored", userId],
		queryFn: () => getStoredData({ data: { userId: userId as string } }),
		enabled: !!userId,
	});

	return {
		workouts: query.data?.workouts ?? [],
		exerciseTemplates: query.data?.templates ?? [],
		lastSyncAt: query.data?.lastSyncAt ?? null,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
	};
}

const THIRTY_MINUTES = 30 * 60 * 1000;

export function useHevyData(apiKey: string | null) {
	const key = apiKey ?? "";
	const enabled = !!apiKey;

	const workoutCount = useQuery({
		queryKey: ["hevy", "count", apiKey],
		queryFn: () => fetchWorkoutCount({ data: { apiKey: key } }),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: THIRTY_MINUTES,
	});

	const workouts = useQuery({
		queryKey: ["hevy", "workouts", apiKey],
		queryFn: () => fetchAllWorkouts({ data: { apiKey: key } }),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: THIRTY_MINUTES,
	});

	const exerciseTemplates = useQuery({
		queryKey: ["hevy", "templates", apiKey],
		queryFn: () => fetchAllExerciseTemplates({ data: { apiKey: key } }),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: THIRTY_MINUTES,
	});

	const routines = useQuery({
		queryKey: ["hevy", "routines", apiKey],
		queryFn: () => fetchAllRoutines({ data: { apiKey: key } }),
		enabled,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: THIRTY_MINUTES,
	});

	const isLoading =
		workouts.isLoading || exerciseTemplates.isLoading || routines.isLoading;

	const isError =
		workouts.isError || exerciseTemplates.isError || routines.isError;

	const error = workouts.error || exerciseTemplates.error || routines.error;

	return {
		workoutCount,
		workouts,
		exerciseTemplates,
		routines,
		isLoading,
		isError,
		error,
	};
}

export function useRecentPRs(userId: string | null) {
	return useQuery({
		queryKey: ["hevy", "prs", userId],
		queryFn: () => getRecentPRs({ data: { userId: userId as string } }),
		enabled: !!userId,
	});
}
