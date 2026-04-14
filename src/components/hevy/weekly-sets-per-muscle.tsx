import { useMemo, useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { MUSCLE_LABELS, weeklySetsPerMuscle } from "#/lib/hevy/metrics";
import { MUSCLE_COLORS } from "#/lib/hevy/muscle-colors";
import type { ExerciseTemplate, MuscleGroup, Workout } from "#/lib/hevy/types";

interface Props {
	workouts: Workout[];
	templates: ExerciseTemplate[];
}

const DEFAULT_MUSCLES: MuscleGroup[] = [
	"chest",
	"upper_back",
	"lats",
	"shoulders",
	"quadriceps",
	"hamstrings",
	"glutes",
	"biceps",
	"triceps",
];

const SELECTABLE = (Object.keys(MUSCLE_LABELS) as MuscleGroup[]).filter(
	(m) => m !== "cardio" && m !== "full_body" && m !== "other",
);

export function WeeklySetsPerMuscle({ workouts, templates }: Props) {
	const [mode, setMode] = useState<string>("default");

	const weekly = useMemo(
		() => weeklySetsPerMuscle(workouts, templates, 12),
		[workouts, templates],
	);

	const activeMuscles: MuscleGroup[] = useMemo(() => {
		if (mode === "default") return DEFAULT_MUSCLES;
		return [mode as MuscleGroup];
	}, [mode]);

	const chartData = useMemo(
		() =>
			weekly.map((w) => {
				const start = new Date(`${w.week}T00:00:00`);
				const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
				const fmt = (d: Date) =>
					d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
				const row: Record<string, number | string> = {
					week: w.week,
					label: w.label,
					range: `${fmt(start)} – ${fmt(end)}`,
				};
				for (const m of activeMuscles) {
					row[m] = Math.round(w.sets[m] * 10) / 10;
				}
				return row;
			}),
		[weekly, activeMuscles],
	);

	const chartConfig = useMemo<ChartConfig>(() => {
		const cfg: ChartConfig = {};
		for (const m of activeMuscles) {
			cfg[m] = {
				label: MUSCLE_LABELS[m],
				color: MUSCLE_COLORS[m] ?? "var(--chart-1)",
			};
		}
		return cfg;
	}, [activeMuscles]);

	const singleMode = activeMuscles.length === 1;

	return (
		<Card className="rise-in" style={{ animationDelay: "140ms" }}>
			<CardHeader>
				<div className="flex items-start justify-between gap-2">
					<div>
						<CardTitle>Weekly Sets per Muscle</CardTitle>
						<CardDescription>
							Working sets over the last 12 weeks
						</CardDescription>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								{mode === "default"
									? "All major"
									: MUSCLE_LABELS[mode as MuscleGroup]}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="end"
							className="max-h-80 overflow-y-auto"
						>
							<DropdownMenuRadioGroup value={mode} onValueChange={setMode}>
								<DropdownMenuRadioItem value="default">
									All major
								</DropdownMenuRadioItem>
								{SELECTABLE.map((m) => (
									<DropdownMenuRadioItem key={m} value={m}>
										{MUSCLE_LABELS[m]}
									</DropdownMenuRadioItem>
								))}
							</DropdownMenuRadioGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-64 w-full">
					<BarChart data={chartData} accessibilityLayer>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="label"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							interval="preserveStartEnd"
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							width={28}
							allowDecimals={false}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(_, payload) =>
										(payload?.[0]?.payload?.range as string) ?? ""
									}
								/>
							}
						/>
						{singleMode && (
							<>
								<ReferenceLine
									y={10}
									stroke="var(--muted-foreground)"
									strokeDasharray="4 4"
									label={{
										value: "MEV",
										position: "right",
										fontSize: 10,
										fill: "var(--muted-foreground)",
									}}
								/>
								<ReferenceLine
									y={20}
									stroke="var(--muted-foreground)"
									strokeDasharray="4 4"
									label={{
										value: "MAV",
										position: "right",
										fontSize: 10,
										fill: "var(--muted-foreground)",
									}}
								/>
							</>
						)}
						{activeMuscles.map((m, i) => (
							<Bar
								key={m}
								dataKey={m}
								stackId="muscle"
								fill={`var(--color-${m})`}
								radius={
									i === activeMuscles.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
								}
							/>
						))}
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
