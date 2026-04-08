import { useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { authClient } from "#/lib/auth-client";

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.filter(Boolean)
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function UserMenu() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	if (!session?.user) return null;

	const { name, email, image } = session.user;
	const initials = name
		? getInitials(name)
		: (email?.[0]?.toUpperCase() ?? "?");

	const handleSignOut = async () => {
		await authClient.signOut();
		navigate({ to: "/login" });
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					aria-label="User menu"
				>
					<Avatar className="h-8 w-8 cursor-pointer transition-opacity hover:opacity-80">
						{image && <AvatarImage src={image} alt={name ?? email ?? "User"} />}
						<AvatarFallback className="text-xs font-medium">
							{initials}
						</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-44">
				<DropdownMenuItem
					onClick={() => navigate({ to: "/profile" })}
					className="cursor-pointer"
				>
					Profile
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={handleSignOut}
					className="cursor-pointer text-destructive focus:text-destructive"
				>
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
