import { Cell, Pie, PieChart } from "recharts";
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
import { muscleDistribution } from "#/lib/hevy/metrics";
import type { ExerciseTemplate, Workout } from "#/lib/hevy/types";

interface Props {
	workouts: Workout[];
	templates: ExerciseTemplate[];
}

const COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"oklch(0.7 0.15 200)",
	"oklch(0.65 0.2 320)",
	"oklch(0.75 0.12 120)",
];

export function MuscleDistribution({ workouts, templates }: Props) {
	const data = muscleDistribution(workouts, templates);
	const totalSets = data.reduce((sum, d) => sum + d.sets, 0);

	const chartConfig = data.reduce<ChartConfig>((acc, entry, i) => {
		acc[entry.muscle] = {
			label: entry.label,
			color: COLORS[i % COLORS.length],
		};
		return acc;
	}, {});

	if (data.length === 0) {
		return (
			<Card className="rise-in" style={{ animationDelay: "150ms" }}>
				<CardHeader>
					<CardTitle>Muscle Groups</CardTitle>
					<CardDescription>Sets per muscle group</CardDescription>
				</CardHeader>
				<CardContent className="flex h-48 items-center justify-center text-sm text-muted-foreground">
					No exercise template data available
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="rise-in" style={{ animationDelay: "150ms" }}>
			<CardHeader>
				<CardTitle>Muscle Groups</CardTitle>
				<CardDescription>
					Distribution of {totalSets.toLocaleString()} total sets
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col items-center gap-4 sm:flex-row">
					<ChartContainer
						config={chartConfig}
						className="h-56 w-56 flex-shrink-0"
					>
						<PieChart accessibilityLayer>
							<ChartTooltip
								content={
									<ChartTooltipContent
										formatter={(value, name) => {
											const entry = data.find((d) => d.muscle === name);
											return `${entry?.label ?? name}: ${value} sets`;
										}}
									/>
								}
							/>
							<Pie
								data={data}
								dataKey="sets"
								nameKey="muscle"
								innerRadius={50}
								outerRadius={90}
								strokeWidth={2}
								stroke="var(--background)"
							>
								{data.map((entry, i) => (
									<Cell key={entry.muscle} fill={COLORS[i % COLORS.length]} />
								))}
							</Pie>
						</PieChart>
					</ChartContainer>
					<div className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
						{data.slice(0, 10).map((entry, i) => (
							<div key={entry.muscle} className="flex items-center gap-2">
								<span
									className="h-2.5 w-2.5 shrink-0 rounded-sm"
									style={{
										backgroundColor: COLORS[i % COLORS.length],
									}}
								/>
								<span className="truncate text-muted-foreground">
									{entry.label}
								</span>
								<span className="ml-auto tabular-nums font-medium">
									{entry.sets}
								</span>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
