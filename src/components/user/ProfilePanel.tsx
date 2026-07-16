"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionStore } from "@/store/useSessionStore";
import {
  useMyProfile,
  useUpdateMyProfile,
  useUploadDriverProfilePhoto,
  type DriverProfile,
} from "@/hooks/useUserProfile";
import { ChangePasswordCard } from "@/components/user/ChangePasswordCard";
import { getApiErrorMessage } from "@/lib/api";
import { validatePhoto } from "@/lib/validatePhoto";
import { toast } from "sonner";

/** View/edit panel for the logged-in user's own profile. Used as a "Profile" tab on all three dashboards. */
export function ProfilePanel() {
  const role = useSessionStore((s) => s.session?.role);
  const profile = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const uploadPhoto = useUploadDriverProfilePhoto();
  const driverProfile = role === "driver" ? (profile.data as DriverProfile | undefined) : undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.name ?? "");
      setEmail(profile.data.email ?? "");
      setPhone(profile.data.phone ?? "");
    }
  }, [profile.data]);

  function handleSave() {
    updateProfile.mutate(
      { name, email, phone },
      { onSuccess: () => setIsEditing(false) }
    );
  }

  if (role === "owner") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account details.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              There&apos;s no profile endpoint for owner accounts yet (only GET
              /api/riders/me and /api/drivers/me exist so far) — add one to light
              this tab up.
            </p>
          </CardContent>
        </Card>
        <ChangePasswordCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your account details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.isLoading && (
          <div className="max-w-sm space-y-4" aria-busy="true" aria-label="Loading profile">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        )}

        {profile.isError && (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(profile.error)}
          </p>
        )}

        {profile.data && (
          <div className="max-w-sm space-y-4">
            {role === "driver" && (
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
                  {driverProfile?.profilePhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={driverProfile.profilePhotoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Camera className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="profile-photo" className="text-xs">
                    Profile photo
                  </Label>
                  <Input
                    id="profile-photo"
                    type="file"
                    accept="image/*"
                    className="text-xs"
                    disabled={uploadPhoto.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const error = validatePhoto(file);
                      if (error) {
                        toast.error("Couldn't use that photo", { description: error });
                        e.target.value = "";
                        return;
                      }
                      uploadPhoto.mutate(file);
                    }}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">Image, up to 5MB</p>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditing}
              />
            </div>
            {"status" in profile.data && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <p className="text-sm capitalize text-muted-foreground">
                  {profile.data.status}
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Member since</Label>
              <p className="text-sm text-muted-foreground">
                {new Date(profile.data.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>

            {role === "driver" && (
              <div className="space-y-1.5">
                <Label>Verification</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {driverProfile?.isActive === false ? "Not verified yet" : "Verified"}
                  </p>
                  <Link href="/driver/documents" className="text-xs text-primary underline">
                    {driverProfile?.isActive === false ? "Complete documents" : "View documents"}
                  </Link>
                </div>
              </div>
            )}

            {updateProfile.isError && (
              <p className="text-sm text-destructive">
                {getApiErrorMessage(updateProfile.error)}
              </p>
            )}

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={updateProfile.isPending}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit profile
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
      </Card>
      <ChangePasswordCard />
    </div>
  );
}
