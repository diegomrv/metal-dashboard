import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { authClient } from "#/lib/auth-client";

export const Route = createFileRoute("/register")({
	component: RegisterPage,
});

function RegisterPage() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!isPending && session?.user) {
			navigate({ to: "/dashboard" });
		}
	}, [session, isPending, navigate]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const result = await authClient.signUp.email({
				name,
				email,
				password,
			});
			if (result.error) {
				setError(result.error.message || "Sign up failed");
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
						Create account
					</CardTitle>
					<CardDescription>
						Sign up to save your data across sessions
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
								disabled={loading}
							/>
						</div>
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
									Creating account...
								</span>
							) : (
								"Create account"
							)}
						</Button>
					</form>

					<p className="mt-4 text-center text-sm text-muted-foreground">
						Already have an account?{" "}
						<Link to="/login" className="text-primary underline">
							Sign in
						</Link>
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
