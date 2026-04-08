import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Badge } from "#/components/ui/badge";
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
import { topExercises } from "#/lib/hevy/metrics";
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
];

const chartConfig = {
	e1rm: {
		label: "Est. 1RM (kg)",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function ExerciseProgression({ workouts, templates }: Props) {
	const exercises = topExercises(workouts, templates, 5);
	const [selected, setSelected] = useState(0);

	if (exercises.length === 0) {
		return (
			<Card className="rise-in" style={{ animationDelay: "240ms" }}>
				<CardHeader>
					<CardTitle>Exercise Progression</CardTitle>
					<CardDescription>Your top lifts over time</CardDescription>
				</CardHeader>
				<CardContent className="flex h-48 items-center justify-center text-sm text-muted-foreground">
					Not enough data to show progressions
				</CardContent>
			</Card>
		);
	}

	const active = exercises[selected];

	return (
		<Card className="rise-in" style={{ animationDelay: "240ms" }}>
			<CardHeader>
				<CardTitle>Exercise Progression</CardTitle>
				<CardDescription>
					Estimated 1RM over time (Epley formula) for your top lifts
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="mb-4 flex flex-wrap gap-2">
					{exercises.map((ex, i) => (
						<button
							key={ex.templateId}
							type="button"
							onClick={() => setSelected(i)}
							className="cursor-pointer"
						>
							<Badge variant={i === selected ? "default" : "outline"}>
								{ex.title}
							</Badge>
						</button>
					))}
				</div>

				{active.pr && (
					<div className="mb-4 flex flex-wrap gap-4 text-sm">
						<div>
							<span className="text-muted-foreground">PR Weight: </span>
							<span className="font-semibold">
								{active.pr.weight} kg x {active.pr.reps}
							</span>
						</div>
						<div>
							<span className="text-muted-foreground">Est. 1RM: </span>
							<span className="font-semibold">{active.pr.e1rm} kg</span>
						</div>
						<div>
							<span className="text-muted-foreground">Total Sets: </span>
							<span className="font-semibold">{active.totalSets}</span>
						</div>
					</div>
				)}

				<ChartContainer
					config={{
						...chartConfig,
						e1rm: {
							...chartConfig.e1rm,
							color: COLORS[selected % COLORS.length],
						},
					}}
					className="h-72 w-full"
				>
					<LineChart data={active.progression} accessibilityLayer>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={(v: string) => {
								const d = new Date(v);
								return d.toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								});
							}}
							interval="preserveStartEnd"
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							width={40}
							tickFormatter={(v: number) => `${Math.round(v)}`}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									formatter={(value) => `${Number(value).toFixed(1)} kg`}
								/>
							}
						/>
						<Line
							dataKey="e1rm"
							type="monotone"
							stroke="var(--color-e1rm)"
							strokeWidth={2}
							dot={{ r: 3, fill: "var(--color-e1rm)" }}
							activeDot={{ r: 5 }}
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
