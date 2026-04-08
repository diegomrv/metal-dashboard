import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/login")({
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const result = await authClient.signIn.email({ email, password });
			if (result.error) {
				setError(result.error.message || "Sign in failed");
			} else {
				navigate({ to: "/connect" });
			}
		} catch {
			setError("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<main className="flex min-h-screen items-center justify-center px-4">
			<Card className="rise-in w-full max-w-sm">
				<CardHeader className="text-center">
					<CardTitle className="font-display text-2xl">
						Metal Dashboard
					</CardTitle>
					<CardDescription>
						Sign in to access your training data
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={loading}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								minLength={8}
								disabled={loading}
							/>
						</div>

						{error && (
							<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
								<p className="text-sm text-destructive">{error}</p>
							</div>
						)}

						<Button type="submit" disabled={loading}>
							{loading ? (
								<span className="flex items-center gap-2">
									<span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
									Signing in...
								</span>
							) : (
								"Sign in"
							)}
						</Button>
					</form>

					<div className="mt-4 flex items-center gap-4">
						<Separator className="flex-1" />
						<span className="text-xs text-muted-foreground">or</span>
						<Separator className="flex-1" />
					</div>

					<Button
						variant="outline"
						className="mt-4 w-full"
						onClick={() => navigate({ to: "/connect" })}
					>
						Use API key without account
					</Button>

					<p className="mt-4 text-center text-sm text-muted-foreground">
						Don't have an account?{" "}
						<Link to="/register" className="text-primary underline">
							Create one
						</Link>
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
