import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
	currentStreak,
	weeklyVolumeDelta,
	workoutsInPeriod,
} from "#/lib/hevy/metrics";
import type { Workout } from "#/lib/hevy/types";

export type DateRange = "7d" | "30d" | "90d" | "1y" | "all";

export const DATE_RANGES: { value: DateRange; label: string }[] = [
	{ value: "7d", label: "7d" },
	{ value: "30d", label: "30d" },
	{ value: "90d", label: "90d" },
	{ value: "1y", label: "1y" },
	{ value: "all", label: "All" },
];

export function filterWorkoutsByRange(
	workouts: Workout[],
	range: DateRange,
): Workout[] {
	if (range === "all") return workouts;
	const days =
		range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	return workouts.filter((w) => new Date(w.start_time) >= since);
}

function formatVolume(kg: number): string {
	if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`;
	return Math.round(kg).toString();
}

interface Props {
	allWorkouts: Workout[];
	loadedCount: number;
	dateRange: DateRange;
	onDateRangeChange: (range: DateRange) => void;
	onSync?: () => void;
	syncing?: boolean;
	lastSyncAt?: string | number | null;
	rightSlot?: React.ReactNode;
}

export function DashboardHeader({
	allWorkouts,
	loadedCount,
	dateRange,
	onDateRangeChange,
	onSync,
	syncing,
	lastSyncAt,
	rightSlot,
}: Props) {
	const streak = currentStreak(allWorkouts);
	const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const thisWeekCount = workoutsInPeriod(allWorkouts, weekAgo);
	const { thisWeek: thisWeekVol, deltaPct } = weeklyVolumeDelta(allWorkouts);

	const deltaPositive = deltaPct != null && deltaPct >= 0;
	const deltaStr =
		deltaPct == null
			? null
			: `${deltaPositive ? "+" : ""}${Math.round(deltaPct)}%`;

	return (
		<header className="rise-in mb-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
						Your Training
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{loadedCount.toLocaleString()} workouts loaded
						{lastSyncAt
							? ` · synced ${new Date(lastSyncAt).toLocaleDateString(
									undefined,
									{
										month: "short",
										day: "numeric",
										hour: "numeric",
										minute: "2-digit",
									},
								)}`
							: ""}
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{onSync && (
						<Button
							variant="outline"
							size="sm"
							onClick={onSync}
							disabled={syncing}
						>
							<RefreshCw
								className={`size-3.5 ${syncing ? "animate-spin" : ""}`}
							/>
							{syncing ? "Syncing" : "Sync"}
						</Button>
					)}
					{rightSlot}
				</div>
			</div>

			<div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
				<dl className="grid grid-cols-3 divide-x divide-border border bg-card ring-1 ring-foreground/10">
					<Kpi
						label="Week streak"
						value={streak.toString()}
						suffix={streak === 1 ? "wk" : "wks"}
					/>
					<Kpi
						label="This week"
						value={thisWeekCount.toString()}
						suffix={thisWeekCount === 1 ? "workout" : "workouts"}
					/>
					<Kpi
						label="Weekly volume"
						value={formatVolume(thisWeekVol)}
						suffix="kg"
						trailing={
							deltaStr ? (
								<span
									className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${
										deltaPositive ? "text-success" : "text-destructive"
									}`}
								>
									{deltaPositive ? (
										<TrendingUp className="size-3" />
									) : (
										<TrendingDown className="size-3" />
									)}
									{deltaStr}
								</span>
							) : null
						}
					/>
				</dl>

				<Tabs
					value={dateRange}
					onValueChange={(v) => onDateRangeChange(v as DateRange)}
				>
					<TabsList className="h-9">
						{DATE_RANGES.map((r) => (
							<TabsTrigger
								key={r.value}
								value={r.value}
								className="px-3 text-xs"
							>
								{r.label}
							</TabsTrigger>
						))}
					</TabsList>
				</Tabs>
			</div>
		</header>
	);
}

function Kpi({
	label,
	value,
	suffix,
	trailing,
}: {
	label: string;
	value: string;
	suffix?: string;
	trailing?: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-0.5 px-3 py-3 first:pl-4 last:pr-4 sm:px-4">
			<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</dt>
			<dd className="flex items-baseline gap-1.5">
				<span className="font-display text-xl font-bold tabular-nums sm:text-2xl">
					{value}
				</span>
				{suffix && (
					<span className="text-xs text-muted-foreground">{suffix}</span>
				)}
				{trailing}
			</dd>
		</div>
	);
}
