import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { weeklyFrequency } from "#/lib/hevy/metrics";
import type { Workout } from "#/lib/hevy/types";

interface Props {
	workouts: Workout[];
}

const chartConfig = {
	count: {
		label: "Workouts",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export function WorkoutFrequency({ workouts }: Props) {
	const data = weeklyFrequency(workouts, 12);

	return (
		<Card className="rise-in flex flex-col" style={{ animationDelay: "120ms" }}>
			<CardHeader>
				<CardTitle>Workout Frequency</CardTitle>
				<CardDescription>Workouts per week (last 12 weeks)</CardDescription>
			</CardHeader>
			<CardContent className="flex-1">
				<ChartContainer config={chartConfig} className="h-full min-h-64 w-full">
					<BarChart data={data} accessibilityLayer>
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
							allowDecimals={false}
							width={24}
						/>
						<ChartTooltip content={<ChartTooltipContent />} />
						<Bar
							dataKey="count"
							fill="var(--color-count)"
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
