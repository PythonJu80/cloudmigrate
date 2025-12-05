"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Users, Plus, Trash2, Shield, Eye, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ConfigModal } from "@/components/config-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export default function TeamPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchTeamMembers();
    }
  }, [session]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (data.members) {
        setMembers(data.members);
      }
    } catch (error) {
      console.error("Failed to fetch team members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add user");
      }

      toast({
        title: "User added",
        description: `${formData.name} has been added to your team.`,
      });

      setFormData({ name: "", email: "", password: "", role: "USER" });
      setIsAddUserOpen(false);
      fetchTeamMembers();
    } catch (error) {
      toast({
        title: "Failed to add user",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/team?id=${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove user");
      }

      toast({
        title: "User removed",
        description: `${userName} has been removed from your team.`,
      });

      fetchTeamMembers();
    } catch (error) {
      toast({
        title: "Failed to remove user",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      toast({
        title: "Role updated",
        description: `User role has been updated to ${newRole}.`,
      });

      fetchTeamMembers();
    } catch (error) {
      toast({
        title: "Failed to update role",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-terminal-green font-mono animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  // Check if current user is admin
  const isAdmin = session.user.role === "ADMIN";

  if (!isAdmin) {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background flex">
          <Sidebar onConfigClick={() => setIsConfigOpen(true)} />
          <div className="w-56 shrink-0" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground">Only admins can manage team members.</p>
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        <Sidebar onConfigClick={() => setIsConfigOpen(true)} />
        <div className="w-56 shrink-0" />

        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="shrink-0">
            <div className="max-w-5xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Users className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">Team Management</h1>
                    <p className="text-xs text-muted-foreground">
                      Add and manage team members for {session.user.tenantName}
                    </p>
                  </div>
                </div>

                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-terminal-green hover:bg-terminal-green/90 text-black">
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Add Team Member</DialogTitle>
                      <DialogDescription className="text-muted-foreground">
                        Create a new user account for your team.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="bg-accent border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@company.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="bg-accent border-border"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                          minLength={8}
                          className="bg-accent border-border"
                        />
                        <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value) => setFormData({ ...formData, role: value })}
                        >
                          <SelectTrigger className="bg-accent border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-accent border-border">
                            <SelectItem value="ADMIN">
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-amber-500" />
                                <span>Admin</span>
                                <span className="text-xs text-muted-foreground">- Full access</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="USER">
                              <div className="flex items-center gap-2">
                                <Eye className="w-4 h-4 text-blue-500" />
                                <span>User</span>
                                <span className="text-xs text-muted-foreground">- View & chat only</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddUserOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-terminal-green hover:bg-terminal-green/90 text-black"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add User"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            {/* Role Legend */}
            <div className="mb-6 p-4 bg-card border border-border rounded-lg">
              <h3 className="text-sm font-medium text-foreground mb-3">Permission Levels</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Shield className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Admin</p>
                    <p className="text-xs text-muted-foreground">
                      Upload files, manage buckets, configure AWS, add/remove team members
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Eye className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">User</p>
                    <p className="text-xs text-muted-foreground">
                      View files, browse buckets, use AI chatbot to query data
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Members Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-accent/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Member
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Role
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Added
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-accent/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {member.name || "Unnamed"}
                            {member.id === session.user.id && (
                              <span className="ml-2 text-xs text-terminal-green">(You)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {member.id === session.user.id ? (
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-500" />
                            <span className="text-sm text-foreground">Admin</span>
                          </div>
                        ) : (
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.id, value)}
                          >
                            <SelectTrigger className="w-32 bg-accent border-border h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-accent border-border">
                              <SelectItem value="ADMIN">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3 text-amber-500" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="USER">
                                <div className="flex items-center gap-2">
                                  <Eye className="w-3 h-3 text-blue-500" />
                                  User
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {member.id !== session.user.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(member.id, member.name || member.email)}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {members.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No team members yet</p>
                  <p className="text-sm text-muted-foreground">Add your first team member to get started</p>
                </div>
              )}
            </div>
          </main>
        </div>

        <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
      </div>
    </TooltipProvider>
  );
}
