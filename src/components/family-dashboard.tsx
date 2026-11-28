import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type TouchEvent,
} from "react"
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Gift,
  ImagePlus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Shuffle,
  Trash2,
  Users,
} from "lucide-react"
import { Menu } from "@base-ui/react/menu"
import { QRCodeSVG } from "qrcode.react"
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom"
import type { User } from "@supabase/supabase-js"

import { FamilyTree } from "@/components/family-tree"
import { InviteScanner } from "@/components/invite-scanner"
import { WishList } from "@/components/wish-list"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type {
  AppTheme,
  AvatarIcon,
  Database,
  TreeTheme,
} from "@/lib/database.types"
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications"
import { ORNAMENT_COLORS, ORNAMENT_ICONS, TREE_THEMES } from "@/lib/tree-theme"
import type { GiftElfSupabaseClient } from "@/lib/supabase"

type FamilyRow = Database["public"]["Tables"]["families"]["Row"]
type FamilyInviteSecret =
  Database["public"]["Tables"]["family_invite_secrets"]["Row"]
type MemberRow = Database["public"]["Tables"]["family_members"]["Row"]
type GiftRow = Database["public"]["Tables"]["gifts"]["Row"]
type WishListRow = Database["public"]["Tables"]["wish_lists"]["Row"]
type ChildRow = Database["public"]["Tables"]["family_children"]["Row"]
type ClaimRow = Database["public"]["Tables"]["claims"]["Row"]
type TeamUpRow = Database["public"]["Tables"]["team_ups"]["Row"]
type TeamUpMemberRow = Database["public"]["Tables"]["team_up_members"]["Row"]
type InviteRow = Database["public"]["Tables"]["family_invites"]["Row"]
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
type FamilySummary = FamilyRow & Pick<MemberRow, "role">
type FamilyProfile = Pick<
  ProfileRow,
  | "id"
  | "display_name"
  | "avatar_color"
  | "avatar_icon"
  | "favorite_items"
  | "things_they_like"
> & { role: MemberRow["role"]; age_label: string | null }
type FamilyDetails = {
  gifts: GiftRow[]
  lists: WishListRow[]
  children: ChildRow[]
  members: FamilyProfile[]
  invites: InviteRow[]
  claims: ClaimRow[]
  teamUps: TeamUpRow[]
  teamUpMembers: TeamUpMemberRow[]
}
type DashboardView = "tree" | "family" | "profile" | "list" | "team-ups"
type FamilyDashboardProps = {
  client: GiftElfSupabaseClient
  user: User
  onSignOut: () => Promise<void>
}

const appThemes: { value: AppTheme; label: string; color: string }[] = [
  { value: "family", label: "Match family", color: "#2f9e78" },
  { value: "classic", label: "Classic", color: "#c52d3a" },
  { value: "tokyo-night", label: "Tokyo Night", color: "#24283b" },
  { value: "mist", label: "Mist", color: "#b8cfd6" },
  { value: "amber", label: "Amber", color: "#e5a331" },
  { value: "cyberpunk", label: "Cyberpunk", color: "#7c3aed" },
]
const appStartedAt = Date.now()
const treeNavigationColors: Record<TreeTheme, string> = {
  classic: "#176b52",
  "tokyo-night": "#435b95",
  mist: "#285f70",
  amber: "#80500f",
  cyberpunk: "#6735a4",
}
const familyNavigationColors: Record<TreeTheme, string> = {
  classic: "#982d3a",
  "tokyo-night": "#704591",
  mist: "#75505a",
  amber: "#38634e",
  cyberpunk: "#00615f",
}

function messageFromError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Try again."
}

function normalizeWebUrl(value: string) {
  if (!value.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

async function fetchFamilySummaries(
  client: GiftElfSupabaseClient,
  userId: string
) {
  const { data: memberships, error: membershipError } = await client
    .from("family_members")
    .select("*")
    .eq("user_id", userId)
  if (membershipError) throw new Error(membershipError.message)
  if (memberships.length === 0) return [] as FamilySummary[]

  const { data: families, error: familiesError } = await client
    .from("families")
    .select("*")
    .in(
      "id",
      memberships.map((membership) => membership.family_id)
    )
    .order("year", { ascending: false })
  if (familiesError) throw new Error(familiesError.message)
  const roles = new Map(
    memberships.map((membership) => [membership.family_id, membership.role])
  )
  return families.map((family) => ({
    ...family,
    role: roles.get(family.id) ?? "member",
  }))
}

async function fetchFamilyDetails(
  client: GiftElfSupabaseClient,
  familyId: string
): Promise<FamilyDetails> {
  const [
    giftResult,
    listResult,
    childResult,
    memberResult,
    inviteResult,
    claimResult,
    teamUpResult,
    ageResult,
  ] = await Promise.all([
    client
      .from("gifts")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false }),
    client
      .from("wish_lists")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at"),
    client
      .from("family_children")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at"),
    client
      .from("family_members")
      .select("*")
      .eq("family_id", familyId)
      .order("joined_at"),
    client
      .from("family_invites")
      .select("*")
      .eq("family_id", familyId)
      .eq("status", "pending"),
    client.from("claims").select("*").eq("family_id", familyId),
    client.from("team_ups").select("*").eq("family_id", familyId),
    client.rpc("get_family_member_ages", { p_family_id: familyId }),
  ])
  for (const result of [
    giftResult,
    listResult,
    childResult,
    memberResult,
    inviteResult,
    claimResult,
    teamUpResult,
    ageResult,
  ]) {
    if (result.error) throw new Error(result.error.message)
  }
  if (
    giftResult.data === null ||
    listResult.data === null ||
    childResult.data === null ||
    memberResult.data === null ||
    inviteResult.data === null ||
    claimResult.data === null ||
    teamUpResult.data === null ||
    ageResult.data === null
  ) {
    throw new Error("Supabase returned an incomplete family response.")
  }

  const memberIds = memberResult.data.map((member) => member.user_id)
  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select(
      "id,display_name,avatar_color,avatar_icon,favorite_items,things_they_like"
    )
    .in("id", memberIds)
  if (profileError) throw new Error(profileError.message)
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const ageById = new Map(
    ageResult.data.map((age) => [age.user_id, age.age_label])
  )
  const members = memberResult.data.flatMap((member) => {
    const profile = profileById.get(member.user_id)
    return profile
      ? [
          {
            ...profile,
            role: member.role,
            age_label: ageById.get(member.user_id) ?? null,
          },
        ]
      : []
  })

  let teamUpMembers: TeamUpMemberRow[] = []
  if (teamUpResult.data.length) {
    const { data, error } = await client
      .from("team_up_members")
      .select("*")
      .in(
        "team_up_id",
        teamUpResult.data.map((teamUp) => teamUp.id)
      )
    if (error) throw new Error(error.message)
    teamUpMembers = data
  }

  return {
    gifts: giftResult.data,
    lists: listResult.data,
    children: childResult.data,
    members,
    invites: inviteResult.data,
    claims: claimResult.data,
    teamUps: teamUpResult.data,
    teamUpMembers,
  }
}

export function FamilyDashboard({
  client,
  user,
  onSignOut,
}: FamilyDashboardProps) {
  const [families, setFamilies] = useState<FamilySummary[]>([])
  const [activeFamilyId, setActiveFamilyId] = useState("")
  const [details, setDetails] = useState<FamilyDetails>({
    gifts: [],
    lists: [],
    children: [],
    members: [],
    invites: [],
    claims: [],
    teamUps: [],
    teamUpMembers: [],
  })
  const [displayName, setDisplayName] = useState("")
  const [favoriteItems, setFavoriteItems] = useState("")
  const [thingsTheyLike, setThingsTheyLike] = useState("")
  const [birthYear, setBirthYear] = useState("")
  const [shareAge, setShareAge] = useState(false)
  const [appTheme, setAppTheme] = useState<AppTheme>("family")
  const [isSavingTheme, setIsSavingTheme] = useState(false)
  const [isSavingTreeTheme, setIsSavingTreeTheme] = useState(false)
  const [familyName, setFamilyName] = useState("")
  const [familyYear, setFamilyYear] = useState(String(new Date().getFullYear()))
  const [inviteCode, setInviteCode] = useState(
    () => new URLSearchParams(window.location.search).get("join") ?? ""
  )
  const [scanningInvite, setScanningInvite] = useState(false)
  const [familyAction, setFamilyAction] = useState<"create" | "join" | null>(
    () =>
      new URLSearchParams(window.location.search).has("join") ? "join" : null
  )
  const [childName, setChildName] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [ownerInvite, setOwnerInvite] = useState<FamilyInviteSecret | null>(
    null
  )
  const [inviteLoading, setInviteLoading] = useState(false)
  const [expiresOn, setExpiresOn] = useState("")
  const [avatarColor, setAvatarColor] = useState(ORNAMENT_COLORS[0])
  const [avatarIcon, setAvatarIcon] = useState<AvatarIcon>("gift")
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { ownerId, childId } = useParams()
  const view: DashboardView =
    pathname.startsWith("/list") || pathname.startsWith("/profile/list")
      ? "list"
      : pathname.startsWith("/profile")
        ? "profile"
        : pathname.startsWith("/team-ups")
          ? "team-ups"
          : pathname.startsWith("/family")
            ? "family"
            : "tree"
  const selectedChild = details.children.find((child) => child.id === childId)
  const listOwnerId = childId
    ? (selectedChild?.parent_id ?? "")
    : (ownerId ?? user.id)
  const [inviteTargets, setInviteTargets] = useState<Record<string, string>>({})
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingId, setPendingId] = useState("")
  const [detailsFamilyId, setDetailsFamilyId] = useState("")
  const [treeDirection, setTreeDirection] = useState<"left" | "right">("right")
  const [clock, setClock] = useState(() => Date.now())
  const accountMenuContainer = useRef<HTMLElement>(null)
  const activeFamilyRef = useRef(activeFamilyId)
  const treeTouchStart = useRef<{ x: number; y: number } | null>(null)
  const suppressTreeClick = useRef(false)
  const [mobileMenu, setMobileMenu] = useState(
    () => window.matchMedia("(max-width: 639px)").matches
  )

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)")
    const update = () => setMobileMenu(query.matches)
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    activeFamilyRef.current = activeFamilyId
  }, [activeFamilyId])

  const activeFamily = families.find((family) => family.id === activeFamilyId)
  const activeFamilyIndex = families.findIndex(
    (family) => family.id === activeFamilyId
  )
  const previousFamily = families[activeFamilyIndex - 1]
  const nextFamily = families[activeFamilyIndex + 1]
  const AccountIcon = ORNAMENT_ICONS[avatarIcon]
  const inviteExpired = ownerInvite
    ? new Date(ownerInvite.invite_code_expires_at).getTime() <= clock
    : false
  const familyYearEnded =
    activeFamily !== undefined &&
    new Date(clock).toISOString().slice(0, 10) > `${activeFamily.year}-12-31`

  useEffect(() => {
    if (!settingsOpen || activeFamily?.role !== "owner") return
    let active = true
    const familyId = activeFamily.id
    async function loadInvite() {
      try {
        const { data, error } = await client
          .from("family_invite_secrets")
          .select("*")
          .eq("family_id", familyId)
          .single()
        if (error) throw new Error(error.message)
        if (!active) return
        setOwnerInvite(data)
        setExpiresOn(
          new Date(new Date(data.invite_code_expires_at).getTime() - 1)
            .toISOString()
            .slice(0, 10)
        )
      } catch (error) {
        if (active) notifyError(messageFromError(error))
      } finally {
        if (active) setInviteLoading(false)
      }
    }
    void loadInvite()
    return () => {
      active = false
    }
  }, [activeFamily?.id, activeFamily?.role, client, settingsOpen])
  const visualTheme =
    view === "tree" || appTheme === "family"
      ? (activeFamily?.tree_theme ?? "classic")
      : appTheme
  const canDeleteFamily =
    details.members.length === 1 && details.members[0]?.id === user.id
  const memberById = useMemo(
    () => new Map(details.members.map((member) => [member.id, member])),
    [details.members]
  )
  const myTeamUps = details.teamUps.filter((teamUp) =>
    details.teamUpMembers.some(
      (member) => member.team_up_id === teamUp.id && member.user_id === user.id
    )
  )
  const isOwnProfileArea =
    view === "profile" || (view === "list" && listOwnerId === user.id)
  const showTeamUpsTab =
    Boolean(activeFamily) &&
    myTeamUps.length > 0 &&
    appStartedAt <= new Date(activeFamily?.year ?? 0, 11, 25, 23, 59).getTime()

  function clearFamilyDetails() {
    setDetailsFamilyId("")
    setDetails({
      gifts: [],
      lists: [],
      children: [],
      members: [],
      invites: [],
      claims: [],
      teamUps: [],
      teamUpMembers: [],
    })
  }

  const refreshFamilies = useCallback(async () => {
    const nextFamilies = await fetchFamilySummaries(client, user.id)
    setFamilies(nextFamilies)
    setActiveFamilyId((current) =>
      nextFamilies.some((family) => family.id === current)
        ? current
        : (nextFamilies[0]?.id ?? "")
    )
  }, [client, user.id])

  const refreshDetails = useCallback(
    async (familyId: string) => {
      const nextDetails = await fetchFamilyDetails(client, familyId)
      if (activeFamilyRef.current === familyId) {
        setDetails(nextDetails)
        setDetailsFamilyId(familyId)
      }
    },
    [client]
  )

  useEffect(() => {
    let active = true
    Promise.all([
      client
        .from("profiles")
        .select(
          "display_name,avatar_color,avatar_icon,favorite_items,things_they_like"
        )
        .eq("id", user.id)
        .maybeSingle(),
      client
        .from("profile_private")
        .select("birth_year,share_age,app_theme")
        .eq("user_id", user.id)
        .maybeSingle(),
      fetchFamilySummaries(client, user.id),
    ])
      .then(([profileResult, privateResult, nextFamilies]) => {
        if (!active) return
        if (profileResult.error) throw new Error(profileResult.error.message)
        if (privateResult.error) throw new Error(privateResult.error.message)
        setDisplayName(
          profileResult.data?.display_name ?? user.email?.split("@")[0] ?? ""
        )
        setAvatarColor(profileResult.data?.avatar_color ?? ORNAMENT_COLORS[0])
        setAvatarIcon(profileResult.data?.avatar_icon ?? "gift")
        setFavoriteItems(profileResult.data?.favorite_items.join(", ") ?? "")
        setThingsTheyLike(profileResult.data?.things_they_like.join(", ") ?? "")
        setBirthYear(privateResult.data?.birth_year?.toString() ?? "")
        setShareAge(privateResult.data?.share_age ?? false)
        setAppTheme(privateResult.data?.app_theme ?? "family")
        setFamilies(nextFamilies)
        setActiveFamilyId((current) =>
          nextFamilies.some((family) => family.id === current)
            ? current
            : (nextFamilies[0]?.id ?? "")
        )
      })
      .catch((error: unknown) => {
        if (active) notifyError(messageFromError(error))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [client, user.email, user.id])

  useEffect(() => {
    if (!activeFamilyId) {
      return
    }
    let active = true
    fetchFamilyDetails(client, activeFamilyId)
      .then((nextDetails) => {
        if (active) {
          setDetails(nextDetails)
          setDetailsFamilyId(activeFamilyId)
        }
      })
      .catch((error: unknown) => {
        if (active) notifyError(messageFromError(error))
      })
    return () => {
      active = false
    }
  }, [activeFamilyId, client])

  useEffect(() => {
    if (!activeFamilyId) return
    const channel = client
      .channel(`family-updates-${activeFamilyId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "families",
          filter: `id=eq.${activeFamilyId}`,
        },
        () =>
          void refreshFamilies().catch((error: unknown) =>
            notifyError(messageFromError(error))
          )
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_members",
          filter: `family_id=eq.${activeFamilyId}`,
        },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            notifyError(messageFromError(error))
          )
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_invites",
          filter: `family_id=eq.${activeFamilyId}`,
        },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            notifyError(messageFromError(error))
          )
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "family_children",
          filter: `family_id=eq.${activeFamilyId}`,
        },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            notifyError(messageFromError(error))
          )
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wish_lists",
          filter: `family_id=eq.${activeFamilyId}`,
        },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            notifyError(messageFromError(error))
          )
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gifts",
          filter: `family_id=eq.${activeFamilyId}`,
        },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            notifyError(messageFromError(error))
          )
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claims" },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            notifyError(messageFromError(error))
          )
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_ups",
          filter: `family_id=eq.${activeFamilyId}`,
        },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            notifyError(messageFromError(error))
          )
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_up_members" },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            notifyError(messageFromError(error))
          )
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [activeFamilyId, client, refreshDetails, refreshFamilies])

  function reportError(error: unknown) {
    notifyError(messageFromError(error))
  }

  async function createFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const { data, error } = await client.rpc("create_family", {
        p_name: familyName.trim(),
        p_year: Number(familyYear),
      })
      if (error) {
        throw new Error(
          error.code === "23505"
            ? "A family with that name already exists for this year. Pick a different name."
            : error.message
        )
      }
      const created = data[0]
      if (!created) throw new Error("Supabase did not return the new family.")
      await refreshFamilies()
      clearFamilyDetails()
      activeFamilyRef.current = created.family_id
      setActiveFamilyId(created.family_id)
      setFamilyName("")
      setFamilyAction(null)
      notifySuccess(`Created ${created.name} (${created.year}).`)
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function joinFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const { data, error } = await client.rpc("join_family", {
        p_invite_code: inviteCode.replace(/[\s-]/g, ""),
      })
      if (error) throw new Error(error.message)
      const joined = data[0]
      if (!joined) throw new Error("Supabase did not return the joined family.")
      await refreshFamilies()
      clearFamilyDetails()
      activeFamilyRef.current = joined.family_id
      setActiveFamilyId(joined.family_id)
      setInviteCode("")
      setFamilyAction(null)
      notifySuccess(`You joined ${joined.name} (${joined.year}).`)
      window.history.replaceState({}, "", window.location.pathname)
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScannedInvite = useCallback((code: string) => {
    setInviteCode(code)
    setScanningInvite(false)
    notifyInfo("Invite scanned. Select Join family to continue.")
  }, [])

  async function deleteFamily() {
    if (!activeFamily || activeFamily.role !== "owner" || !canDeleteFamily)
      return
    if (
      !window.confirm(
        `Delete ${activeFamily.name} (${activeFamily.year})? This permanently removes its children, lists, gifts, and invitations.`
      )
    )
      return
    setIsSubmitting(true)
    try {
      const { error } = await client.rpc("delete_empty_family", {
        p_family_id: activeFamily.id,
      })
      if (error) throw new Error(error.message)
      setSettingsOpen(false)
      setOwnerInvite(null)
      clearFamilyDetails()
      setFamilies((current) =>
        current.filter((family) => family.id !== activeFamily.id)
      )
      setActiveFamilyId("")
      notifySuccess(`Deleted ${activeFamily.name}.`)
      await refreshFamilies()
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function regenerateInvite() {
    if (!activeFamily || activeFamily.role !== "owner") return
    if (
      !window.confirm(
        "Create a new invite? The old link, QR code, and code will stop working."
      )
    )
      return
    setIsSubmitting(true)
    try {
      const { data, error } = await client.rpc("regenerate_family_invite", {
        p_family_id: activeFamily.id,
      })
      if (error) throw new Error(error.message)
      setOwnerInvite((current) =>
        current?.family_id === activeFamily.id
          ? { ...current, invite_code: data }
          : current
      )
      notifySuccess(
        "A new family invite is ready. The old invite no longer works."
      )
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const year = birthYear.trim() ? Number(birthYear) : null
      if (
        year !== null &&
        (!Number.isInteger(year) ||
          year < 1900 ||
          year > new Date().getFullYear())
      ) {
        throw new Error("Enter a valid birth year.")
      }
      const { error: profileError } = await client
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          avatar_color: avatarColor,
          avatar_icon: avatarIcon,
          favorite_items: favoriteItems
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          things_they_like: thingsTheyLike
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        })
        .eq("id", user.id)
      if (profileError) throw new Error(profileError.message)
      const { error: privateError } = await client
        .from("profile_private")
        .update({ birth_year: year, share_age: shareAge })
        .eq("user_id", user.id)
      if (privateError) throw new Error(privateError.message)
      notifySuccess("Your profile was saved.")
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updateTreeTheme(theme: TreeTheme) {
    if (!activeFamily || activeFamily.role !== "owner" || isSavingTreeTheme)
      return
    setIsSavingTreeTheme(true)
    try {
      const { error } = await client
        .from("families")
        .update({ tree_theme: theme })
        .eq("id", activeFamily.id)
      if (error) throw new Error(error.message)
      setFamilies((current) =>
        current.map((family) =>
          family.id === activeFamily.id
            ? { ...family, tree_theme: theme }
            : family
        )
      )
      notifySuccess(
        `${TREE_THEMES[theme].label} tree theme shared with your family.`
      )
    } catch (error) {
      reportError(error)
    } finally {
      setIsSavingTreeTheme(false)
    }
  }

  function randomizeTreeTheme() {
    if (!activeFamily) return
    const choices = (Object.keys(TREE_THEMES) as TreeTheme[]).filter(
      (theme) => theme !== activeFamily.tree_theme
    )
    void updateTreeTheme(choices[Math.floor(Math.random() * choices.length)])
  }

  async function updateAppTheme(theme: AppTheme) {
    if (theme === appTheme || isSavingTheme) return
    setIsSavingTheme(true)
    try {
      const { data, error } = await client
        .from("profile_private")
        .update({ app_theme: theme })
        .eq("user_id", user.id)
        .select("app_theme")
        .single()
      if (error) throw new Error(error.message)
      setAppTheme(data.app_theme)
      notifySuccess("Your personal theme was saved.")
    } catch (error) {
      reportError(error)
    } finally {
      setIsSavingTheme(false)
    }
  }

  async function copyInviteLink() {
    if (
      !activeFamily ||
      activeFamily.role !== "owner" ||
      ownerInvite?.family_id !== activeFamily.id
    )
      return
    const link = `${window.location.origin}/?join=${encodeURIComponent(ownerInvite.invite_code)}`
    try {
      await navigator.clipboard.writeText(link)
      notifySuccess("Family invite link copied.")
    } catch (error) {
      reportError(error)
    }
  }

  async function saveInviteExpiration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !activeFamily ||
      activeFamily.role !== "owner" ||
      ownerInvite?.family_id !== activeFamily.id
    )
      return
    setIsSubmitting(true)
    try {
      const { data, error } = await client.rpc("set_family_invite_expiry", {
        p_family_id: activeFamily.id,
        p_expires_on: expiresOn,
      })
      if (error) throw new Error(error.message)
      setOwnerInvite((current) =>
        current?.family_id === activeFamily.id
          ? { ...current, invite_code_expires_at: data }
          : current
      )
      notifySuccess("Invite expiration updated.")
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function addChild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeFamily) return
    const name = childName.trim()
    if (!name) {
      notifyError("Enter your child's name.")
      return
    }
    setIsSubmitting(true)
    try {
      const { error } = await client.from("family_children").insert({
        family_id: activeFamily.id,
        parent_id: user.id,
        display_name: name,
      })
      if (error) throw new Error(error.message)
      setChildName("")
      await refreshDetails(activeFamily.id)
      notifySuccess(`${name} was added to this family.`)
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function removeChild(child: ChildRow) {
    if (!activeFamily || child.parent_id !== user.id) return
    if (
      !window.confirm(
        `Remove ${child.display_name} from this family? Their lists, gifts, claims, and team-ups will be permanently deleted.`
      )
    )
      return
    setPendingId(child.id)
    try {
      const { error } = await client
        .from("family_children")
        .delete()
        .eq("id", child.id)
        .eq("family_id", activeFamily.id)
        .eq("parent_id", user.id)
      if (error) throw new Error(error.message)
      await refreshDetails(activeFamily.id)
      notifySuccess(`${child.display_name} was removed from this family.`)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  async function claimGift(giftId: string) {
    setPendingId(giftId)
    try {
      const { error } = await client.rpc("claim_gift", { p_gift_id: giftId })
      if (error) throw new Error(error.message)
      notifySuccess(
        "You claimed this gift. The person who wants it cannot see your claim."
      )
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  async function releaseClaim(giftId: string) {
    setPendingId(giftId)
    try {
      const { error } = await client.rpc("release_gift_claim", {
        p_gift_id: giftId,
      })
      if (error) throw new Error(error.message)
      notifySuccess("Your claim was removed.")
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  async function createTeamUp(giftId: string) {
    setPendingId(giftId)
    try {
      const { error } = await client.rpc("create_team_up", {
        p_gift_id: giftId,
      })
      if (error) throw new Error(error.message)
      notifySuccess(
        "Team-up created. Invite family members from the Team-ups tab."
      )
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  async function confirmTeamUp(teamUpId: string) {
    setPendingId(teamUpId)
    try {
      const { error } = await client.rpc("confirm_team_up", {
        p_team_up_id: teamUpId,
      })
      if (error) throw new Error(error.message)
      notifySuccess("You're on the team-up.")
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  async function inviteToTeamUp(teamUpId: string) {
    const userId = inviteTargets[teamUpId]
    if (!userId) return
    setPendingId(teamUpId)
    try {
      const { error } = await client.rpc("invite_to_team_up", {
        p_team_up_id: teamUpId,
        p_user_id: userId,
      })
      if (error) throw new Error(error.message)
      setInviteTargets((current) => ({ ...current, [teamUpId]: "" }))
      notifySuccess(
        "Invitation sent. They'll see the team-up once they log in."
      )
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  async function completeTeamUp(
    event: FormEvent<HTMLFormElement>,
    teamUpId: string
  ) {
    event.preventDefault()
    const proofUrl = normalizeWebUrl(proofUrls[teamUpId] ?? "")
    if (!proofUrl) {
      reportError(
        new Error(
          "Add a valid purchase-proof link before marking the team-up complete."
        )
      )
      return
    }
    setPendingId(teamUpId)
    try {
      const { error } = await client.rpc("complete_team_up", {
        p_team_up_id: teamUpId,
        p_purchase_proof_url: proofUrl,
      })
      if (error) throw new Error(error.message)
      notifySuccess(
        "Team-up marked purchased with proof. The gift is now claimed."
      )
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  const selectedMember = memberById.get(listOwnerId)
  function openList(ownerId: string) {
    if (details.children.some((child) => child.id === ownerId)) {
      navigate(`/list/child/${ownerId}`)
    } else {
      navigate(ownerId === user.id ? "/list" : `/list/${ownerId}`)
    }
  }

  const treeMembers = details.members.flatMap((member) => [
    member,
    ...details.children
      .filter((child) => child.parent_id === member.id)
      .map((child) => ({
        id: child.id,
        display_name: child.display_name,
        avatar_color: member.avatar_color,
        avatar_icon: member.avatar_icon,
        parentName: member.display_name,
      })),
  ])
  function selectFamily(id: string) {
    if (id === activeFamilyId) return
    const previousIndex = families.findIndex(
      (family) => family.id === activeFamilyId
    )
    const nextIndex = families.findIndex((family) => family.id === id)
    setTreeDirection(nextIndex > previousIndex ? "right" : "left")
    activeFamilyRef.current = id
    setSettingsOpen(false)
    setOwnerInvite(null)
    clearFamilyDetails()
    setChildName("")
    setActiveFamilyId(id)
  }

  function handleTreeTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!mobileMenu || event.touches.length !== 1) {
      treeTouchStart.current = null
      return
    }
    const touch = event.touches[0]
    treeTouchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleTreeTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = treeTouchStart.current
    treeTouchStart.current = null
    if (!start || event.changedTouches.length !== 1) return
    const touch = event.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return
    suppressTreeClick.current = true
    window.setTimeout(() => {
      suppressTreeClick.current = false
    }, 400)
    const target = dx < 0 ? nextFamily : previousFamily
    if (target) selectFamily(target.id)
  }

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const today = new Date(clock)
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  const christmasYear =
    today.getMonth() === 11 && today.getDate() > 25
      ? today.getFullYear() + 1
      : today.getFullYear()
  const daysUntilChristmas = Math.round(
    (Date.UTC(christmasYear, 11, 25) -
      Date.UTC(
        todayStart.getFullYear(),
        todayStart.getMonth(),
        todayStart.getDate()
      )) /
      86_400_000
  )

  const navClass = (selected: boolean) =>
    `app-nav-link rounded-full px-4 py-2 text-sm font-semibold ${selected ? "is-active" : ""}`

  useLayoutEffect(() => {
    const root = document.documentElement
    const meta = document.querySelector('meta[name="theme-color"]')
    const previousTheme = root.getAttribute("data-app-theme")
    const previousMetaColor = meta?.getAttribute("content")
    return () => {
      if (previousTheme === null) delete root.dataset.appTheme
      else root.dataset.appTheme = previousTheme
      if (meta && previousMetaColor !== undefined) {
        if (previousMetaColor === null) meta.removeAttribute("content")
        else meta.setAttribute("content", previousMetaColor)
      }
    }
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    const meta = document.querySelector('meta[name="theme-color"]')
    root.dataset.appTheme = visualTheme
    const bg = getComputedStyle(
      document.querySelector(".app-background") ?? root
    ).getPropertyValue("--app-via-target")
    if (meta && bg) meta.setAttribute("content", bg.trim())
  }, [visualTheme])

  return (
    <div className="space-y-6">
      <header
        className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-40"
        ref={accountMenuContainer}
      >
        <Menu.Root>
          <Menu.Trigger
            aria-label="Open navigation and account menu"
            className="flex min-h-11 items-center gap-3 rounded-xl border-2 border-white/40 px-3 py-2 font-semibold text-white shadow-xl transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            style={{
              backgroundColor:
                treeNavigationColors[activeFamily?.tree_theme ?? "classic"],
            }}
          >
            <span
              className="hidden size-9 items-center justify-center rounded-full border-2 border-white/70 sm:flex"
              style={{ backgroundColor: avatarColor }}
            >
              <AccountIcon
                aria-hidden="true"
                className="size-5 text-[#171717]"
              />
            </span>
            <span className="hidden max-w-36 truncate text-sm sm:block">
              {displayName || "Menu"}
            </span>
            <ChevronLeft aria-hidden="true" className="size-5 sm:hidden" />
            <ChevronUp aria-hidden="true" className="hidden size-5 sm:block" />
          </Menu.Trigger>
          <Menu.Portal className="absolute" container={accountMenuContainer}>
            <Menu.Positioner
              align="end"
              className="z-50"
              side={mobileMenu ? "left" : "top"}
              sideOffset={8}
            >
              <Menu.Popup
                className="account-menu-popup max-h-[min(70dvh,32rem)] w-56 max-w-[calc(100vw-5rem)] overflow-y-auto rounded-xl border border-border bg-background p-2 text-foreground shadow-xl outline-none"
                data-mobile={mobileMenu}
              >
                <p className="max-w-60 truncate px-3 py-2 text-xs text-muted-foreground">
                  {displayName || user.email}
                </p>
                <Menu.Item
                  aria-current={view === "tree" ? "page" : undefined}
                  className="mb-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-white outline-none data-highlighted:brightness-125"
                  onClick={() => navigate("/tree")}
                  style={{
                    backgroundColor:
                      treeNavigationColors[
                        activeFamily?.tree_theme ?? "classic"
                      ],
                  }}
                >
                  Tree{view === "tree" ? " · Current" : ""}
                </Menu.Item>
                <Menu.Item
                  aria-current={view === "family" ? "page" : undefined}
                  className="mb-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-white outline-none data-highlighted:brightness-125"
                  onClick={() => navigate("/family")}
                  style={{
                    backgroundColor:
                      familyNavigationColors[
                        activeFamily?.tree_theme ?? "classic"
                      ],
                  }}
                >
                  Family{view === "family" ? " · Current" : ""}
                </Menu.Item>
                {showTeamUpsTab && (
                  <Menu.Item
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium outline-none data-highlighted:bg-muted"
                    onClick={() => navigate("/team-ups")}
                  >
                    Team-ups
                  </Menu.Item>
                )}
                {families.length > 1 && (
                  <>
                    <p className="mt-2 border-t border-border px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground">
                      Switch family tree
                    </p>
                    {families.map((family) => (
                      <Menu.Item
                        aria-current={
                          family.id === activeFamilyId ? "true" : undefined
                        }
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none data-highlighted:bg-muted"
                        key={family.id}
                        onClick={() => selectFamily(family.id)}
                      >
                        <span
                          aria-hidden="true"
                          className="size-3 shrink-0 rounded-full border border-foreground"
                          style={{
                            backgroundColor:
                              TREE_THEMES[family.tree_theme].tiers[2],
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {family.name} · {family.year}
                        </span>
                        {family.id === activeFamilyId && (
                          <span aria-hidden="true">✓</span>
                        )}
                      </Menu.Item>
                    ))}
                  </>
                )}
                <div className="mt-2 border-t border-border pt-1" />
                <Menu.Item
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium outline-none data-highlighted:bg-muted"
                  onClick={() => navigate("/profile")}
                >
                  Profile settings
                </Menu.Item>
                <Menu.Item
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium outline-none data-highlighted:bg-muted"
                  onClick={() => {
                    navigate("/profile/list")
                  }}
                >
                  My list
                </Menu.Item>
                <Menu.Item
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium outline-none data-highlighted:bg-muted"
                  onClick={() => void onSignOut()}
                >
                  Sign out
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </header>

      {view !== "tree" && families.length > 0 && (
        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          Family
          <select
            aria-label="Active family"
            className="h-10 max-w-60 rounded-lg border border-border bg-white px-3"
            onChange={(event) => selectFamily(event.target.value)}
            value={activeFamilyId}
          >
            {families.map((family) => (
              <option key={family.id} value={family.id}>
                {family.name} · {family.year}
              </option>
            ))}
          </select>
        </label>
      )}

      {view === "tree" && (
        <section className="tree-page h-fullpage-transition">
          <div className="tree-page-heading">
            <h2 className="max-w-2xl font-mono text-3xl font-black tracking-tight break-words text-[color:var(--tree-heading)] sm:text-5xl lg:text-6xl">
              {activeFamily ? activeFamily.name : "Your family tree"}
            </h2>
            <p
              className="mt-2 font-mono text-sm font-semibold sm:text-base"
              aria-live="polite"
            >
              {daysUntilChristmas === 0
                ? "Merry Christmas!"
                : `${daysUntilChristmas} days until Christmas`}
            </p>
            {families.length > 1 && (
              <p className="mt-1 text-xs sm:hidden">Swipe to switch trees.</p>
            )}
          </div>
          <div
            aria-label="Family tree"
            className="tree-page-scroll"
            key={activeFamilyId}
            role="region"
            tabIndex={0}
          >
            <div className="tree-page-stage">
              {detailsFamilyId === activeFamilyId &&
              details.members.length > 0 ? (
                <div
                  className={`tree-slide tree-slide--${treeDirection}`}
                  key={activeFamilyId}
                >
                  <div
                    className="tree-scene relative mx-auto max-w-5xl touch-pan-y"
                    onTouchStart={handleTreeTouchStart}
                    onTouchCancel={() => {
                      treeTouchStart.current = null
                    }}
                    onTouchEnd={handleTreeTouchEnd}
                    onClickCapture={(event) => {
                      if (suppressTreeClick.current) {
                        event.preventDefault()
                        event.stopPropagation()
                        suppressTreeClick.current = false
                      }
                    }}
                  >
                    {previousFamily && (
                      <div
                        aria-hidden="true"
                        className="tree-neighbor tree-neighbor--left"
                      >
                        <FamilyTree
                          currentUserId={user.id}
                          members={[]}
                          theme={previousFamily.tree_theme}
                          onSelect={openList}
                        />
                      </div>
                    )}
                    {nextFamily && (
                      <div
                        aria-hidden="true"
                        className="tree-neighbor tree-neighbor--right"
                      >
                        <FamilyTree
                          currentUserId={user.id}
                          members={[]}
                          theme={nextFamily.tree_theme}
                          onSelect={openList}
                        />
                      </div>
                    )}
                    <div className="relative z-10">
                      <FamilyTree
                        currentUserId={user.id}
                        members={treeMembers}
                        theme={activeFamily?.tree_theme ?? "classic"}
                        onSelect={openList}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-sm">
                  {isLoading ||
                  (activeFamilyId && detailsFamilyId !== activeFamilyId)
                    ? "Decorating the tree..."
                    : "Create or join a family to hang your ornaments."}{" "}
                  {!isLoading && !activeFamilyId && (
                    <NavLink className="font-bold underline" to="/family">
                      Go to Family
                    </NavLink>
                  )}
                </p>
              )}
            </div>
          </div>
          {families.length > 1 && (
            <nav
              aria-label="Choose family tree"
              className="tree-page-navigation hidden flex-wrap items-center justify-center gap-2 sm:flex"
            >
              <button
                aria-label="Previous tree"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
                disabled={!previousFamily}
                onClick={() =>
                  previousFamily && selectFamily(previousFamily.id)
                }
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </button>
              <div className="flex max-w-full flex-wrap justify-center gap-1">
                {families.map((family) => (
                  <button
                    aria-current={
                      family.id === activeFamilyId ? "true" : undefined
                    }
                    aria-label={`${family.name} (${family.year})`}
                    className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    key={family.id}
                    onClick={() => selectFamily(family.id)}
                    title={`${family.name} · ${family.year}`}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={`size-5 rounded-full border-2 border-background shadow-sm ${family.id === activeFamilyId ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                      style={{
                        backgroundColor:
                          TREE_THEMES[family.tree_theme].tiers[2],
                      }}
                    />
                  </button>
                ))}
              </div>
              <button
                aria-label="Next tree"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
                disabled={!nextFamily}
                onClick={() => nextFamily && selectFamily(nextFamily.id)}
                type="button"
              >
                <ChevronRight aria-hidden="true" className="size-5" />
              </button>
            </nav>
          )}
        </section>
      )}

      {view === "family" && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setScanningInvite(false)
                setFamilyAction((current) => (current ? null : "create"))
              }}
              type="button"
              variant="outline"
            >
              {familyAction ? "Close" : "Create or Join"}
            </Button>
            {familyAction && (
              <>
                <Button
                  aria-pressed={familyAction === "create"}
                  onClick={() => {
                    setScanningInvite(false)
                    setFamilyAction("create")
                  }}
                  type="button"
                  variant={familyAction === "create" ? "default" : "outline"}
                >
                  Create
                </Button>
                <Button
                  aria-pressed={familyAction === "join"}
                  onClick={() => setFamilyAction("join")}
                  type="button"
                  variant={familyAction === "join" ? "default" : "outline"}
                >
                  Join
                </Button>
              </>
            )}
          </div>
          {activeFamily && (
            <section className="page-transition space-y-3 rounded-2xl bg-white p-5 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-accent-red uppercase">
                    {activeFamily.year} ·{" "}
                    {details.members.length + details.children.length} members
                  </p>
                  <h2 className="text-2xl font-bold text-lighter-black">
                    {activeFamily.name}
                  </h2>
                </div>
                {activeFamily.role === "owner" && (
                  <Sheet
                    open={settingsOpen}
                    onOpenChange={(open) => {
                      setSettingsOpen(open)
                      setOwnerInvite(null)
                      setInviteLoading(open)
                    }}
                  >
                    <SheetTrigger
                      render={
                        <Button
                          aria-label="Family settings"
                          size="icon"
                          type="button"
                          variant="outline"
                        />
                      }
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </SheetTrigger>
                    <SheetContent
                      container={accountMenuContainer}
                      className="w-full max-w-[min(100vw,26rem)] overflow-y-auto bg-background text-sm text-foreground"
                      side="right"
                    >
                      <SheetHeader>
                        <SheetTitle className="text-lg font-bold">
                          {activeFamily.name} settings
                        </SheetTitle>
                        <SheetDescription>
                          Manage this family&apos;s invitation and tree.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="space-y-5 px-4 pb-6">
                        <section className="space-y-3">
                          <h3 className="text-sm font-bold">Family invite</h3>
                          {inviteLoading ? (
                            <p className="text-sm text-muted-foreground">
                              Loading invite…
                            </p>
                          ) : ownerInvite?.family_id === activeFamily.id ? (
                            <>
                              <QRCodeSVG
                                aria-label="Family invite QR code"
                                marginSize={4}
                                size={160}
                                value={`${window.location.origin}/?join=${encodeURIComponent(ownerInvite.invite_code)}`}
                              />
                              <p className="font-mono text-xs font-semibold break-all">
                                {ownerInvite.invite_code
                                  .match(/.{1,4}/g)
                                  ?.join(" ")}
                              </p>
                              {inviteExpired && (
                                <p
                                  className="text-sm text-muted-foreground"
                                  role="status"
                                >
                                  {familyYearEnded
                                    ? "This family year has ended. Create a new family for a new invite."
                                    : "This invite has expired. Update its expiration before sharing or regenerating it."}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  className="gap-2 text-sm"
                                  disabled={inviteExpired}
                                  onClick={() => void copyInviteLink()}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  <Copy aria-hidden="true" /> Copy invite link
                                </Button>
                                <Button
                                  className="gap-2 text-sm"
                                  disabled={isSubmitting || inviteExpired}
                                  onClick={() => void regenerateInvite()}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  <RefreshCw aria-hidden="true" /> New invite
                                </Button>
                              </div>
                              <form
                                className="space-y-2"
                                onSubmit={(event) =>
                                  void saveInviteExpiration(event)
                                }
                              >
                                <label
                                  className="block text-sm font-medium"
                                  htmlFor="invite-expiry"
                                >
                                  Valid through (UTC)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  <Input
                                    disabled={familyYearEnded}
                                    id="invite-expiry"
                                    className="w-auto"
                                    min={new Date(clock)
                                      .toISOString()
                                      .slice(0, 10)}
                                    max={`${activeFamily.year}-12-31`}
                                    onChange={(event) =>
                                      setExpiresOn(event.target.value)
                                    }
                                    required
                                    type="date"
                                    value={expiresOn}
                                  />
                                  <Button
                                    className="text-sm"
                                    disabled={
                                      isSubmitting ||
                                      !expiresOn ||
                                      familyYearEnded
                                    }
                                    size="sm"
                                    type="submit"
                                    variant="outline"
                                  >
                                    Save expiration
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  The invite expires at the end of this UTC
                                  date, no later than the end of{" "}
                                  {activeFamily.year}.
                                </p>
                              </form>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Invite details could not be loaded. Close and
                              reopen settings to retry.
                            </p>
                          )}
                        </section>
                        <section className="space-y-2 border-t border-border pt-4">
                          <h3 className="text-sm font-bold">Tree theme</h3>
                          <div className="flex flex-wrap gap-2">
                            {(Object.keys(TREE_THEMES) as TreeTheme[]).map(
                              (key) => (
                                <button
                                  aria-pressed={activeFamily.tree_theme === key}
                                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${activeFamily.tree_theme === key ? "border-accent-red ring-2 ring-accent-red/30" : "border-border"}`}
                                  disabled={isSavingTreeTheme}
                                  key={key}
                                  onClick={() => void updateTreeTheme(key)}
                                  type="button"
                                >
                                  <span
                                    aria-hidden="true"
                                    className="size-4 rounded-full border"
                                    style={{
                                      backgroundColor:
                                        TREE_THEMES[key].tiers[1],
                                    }}
                                  />
                                  {TREE_THEMES[key].label}
                                </button>
                              )
                            )}
                          </div>
                          <Button
                            disabled={isSavingTreeTheme}
                            onClick={randomizeTreeTheme}
                            type="button"
                            variant="outline"
                          >
                            <Shuffle aria-hidden="true" /> Random theme
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            Random chooses a coordinated palette. The tree theme
                            is shared with every family member.
                          </p>
                        </section>
                        <section className="space-y-2 border-t border-border pt-4">
                          <Button
                            disabled={isSubmitting || !canDeleteFamily}
                            onClick={() => void deleteFamily()}
                            type="button"
                            variant="destructive"
                          >
                            <Trash2 aria-hidden="true" /> Delete family tree
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            You can delete the family only when no other members
                            have joined.
                          </p>
                        </section>
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
              </div>
              <div
                aria-label="Family members"
                className="flex flex-wrap items-start gap-4 pt-2"
              >
                {details.members.map((member) => {
                  const Icon =
                    ORNAMENT_ICONS[member.avatar_icon] ?? ORNAMENT_ICONS.gift
                  return (
                    <div className="contents" key={member.id}>
                      <button
                        aria-label={`${member.display_name}'s wish lists`}
                        className="flex w-28 flex-col items-center gap-1 text-center text-sm font-medium text-lighter-black hover:underline sm:w-32"
                        onClick={() => openList(member.id)}
                        type="button"
                      >
                        <Avatar className="size-20 sm:size-24">
                          <AvatarFallback
                            style={{ backgroundColor: member.avatar_color }}
                          >
                            <Icon
                              aria-hidden="true"
                              className="size-8 text-[#171717]"
                            />
                          </AvatarFallback>
                        </Avatar>
                        <span className="wrap-break-words w-full">
                          {member.display_name}
                        </span>
                        {member.role === "owner" && (
                          <span className="text-xs text-muted-foreground">
                            Owner
                          </span>
                        )}
                      </button>
                      {details.children
                        .filter((child) => child.parent_id === member.id)
                        .map((child) => (
                          <div
                            className="flex w-28 flex-col items-center text-center sm:w-32"
                            key={child.id}
                          >
                            <button
                              aria-label={`${child.display_name}'s wish lists, child of ${member.display_name}`}
                              className="flex w-full flex-col items-center gap-1 text-sm font-medium text-lighter-black hover:underline"
                              onClick={() => openList(child.id)}
                              type="button"
                            >
                              <Avatar className="size-20 sm:size-24">
                                <AvatarFallback
                                  style={{
                                    backgroundColor: member.avatar_color,
                                  }}
                                >
                                  <Icon
                                    aria-hidden="true"
                                    className="size-8 text-[#171717]"
                                  />
                                </AvatarFallback>
                              </Avatar>
                              <span className="wrap-break-words w-full">
                                {child.display_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Child of {member.display_name}
                              </span>
                            </button>
                            {member.id === user.id && (
                              <button
                                aria-label={`Remove ${child.display_name}`}
                                className="mt-1 text-xs text-muted-foreground underline"
                                disabled={pendingId === child.id}
                                onClick={() => void removeChild(child)}
                                type="button"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  )
                })}
                {detailsFamilyId !== activeFamily.id && (
                  <p className="text-sm text-muted-foreground">
                    Loading members…
                  </p>
                )}
              </div>
              <details className="border-t border-border pt-3">
                <summary className="cursor-pointer text-sm font-semibold text-lighter-black">
                  Add my child
                </summary>
                <form
                  className="mt-4 flex flex-wrap gap-2"
                  onSubmit={(event) => void addChild(event)}
                >
                  <Input
                    aria-label="Child's name"
                    className="max-w-xs rounded-lg"
                    maxLength={80}
                    onChange={(event) => setChildName(event.target.value)}
                    placeholder="Child's name"
                    value={childName}
                  />
                  <Button
                    disabled={isSubmitting}
                    type="submit"
                    variant="outline"
                  >
                    <Plus aria-hidden="true" /> Add my child
                  </Button>
                </form>
                <p className="mt-2 text-xs text-muted-foreground">
                  Children are visible only in this family. You manage their
                  lists.
                </p>
              </details>
            </section>
          )}
          {familyAction && (
            <div className="page-transition">
              {familyAction === "create" && (
                <form
                  className="space-y-3 rounded-2xl bg-white p-5 shadow-lg"
                  onSubmit={createFamily}
                >
                  <h2 className="text-xl font-bold text-lighter-black">
                    Create a family for a year
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                    <Input
                      aria-label="Family name"
                      className="h-11 rounded-lg px-3"
                      maxLength={100}
                      onChange={(event) => setFamilyName(event.target.value)}
                      placeholder="The North Pole crew"
                      required
                      value={familyName}
                    />
                    <Input
                      aria-label="Family year"
                      className="h-11 rounded-lg px-3"
                      max={9998}
                      min={2000}
                      onChange={(event) => setFamilyYear(event.target.value)}
                      required
                      type="number"
                      value={familyYear}
                    />
                  </div>
                  <Button
                    className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/80"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    <Plus aria-hidden="true" className="mr-2 size-4" />
                    Create family
                  </Button>
                </form>
              )}

              {familyAction === "join" && (
                <form
                  className="space-y-3 rounded-2xl bg-white p-5 shadow-lg"
                  onSubmit={joinFamily}
                >
                  <h2 className="text-xl font-bold text-lighter-black">
                    Join a family
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Type a family invite code or scan its QR code.
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      aria-label="Family invite code"
                      autoCapitalize="characters"
                      className="h-11 rounded-lg px-3 uppercase"
                      onChange={(event) =>
                        setInviteCode(event.target.value.toUpperCase())
                      }
                      placeholder="Type or paste family code"
                      required
                      value={inviteCode}
                    />
                    <Button
                      className="h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80"
                      disabled={isSubmitting}
                      type="submit"
                    >
                      Join family
                    </Button>
                  </div>
                  <Button
                    className="gap-2 rounded-lg"
                    onClick={() => setScanningInvite((current) => !current)}
                    type="button"
                    variant="outline"
                  >
                    <Camera aria-hidden="true" className="size-4" />
                    {scanningInvite ? "Close camera" : "Scan invite QR code"}
                  </Button>
                  {scanningInvite && (
                    <InviteScanner
                      onClose={() => setScanningInvite(false)}
                      onScan={handleScannedInvite}
                    />
                  )}
                </form>
              )}
            </div>
          )}

          {!activeFamily && (
            <p className="page-transition rounded-xl bg-white p-6 text-sm text-muted-foreground">
              {isLoading
                ? "Loading your families…"
                : "You haven't joined a family yet. Create one or use an invite code to get started."}
            </p>
          )}
        </>
      )}

      {(view === "profile" || view === "list") && (
        <div
          className={`page-transition ${isOwnProfileArea ? "grid gap-5 md:grid-cols-[12rem_1fr]" : ""}`}
          key={pathname}
        >
          {isOwnProfileArea && (
            <aside
              aria-label="Profile sections"
              className="flex gap-2 md:flex-col"
            >
              <NavLink
                className={() => navClass(view === "profile")}
                to="/profile"
              >
                Your profile
              </NavLink>
              <NavLink
                className={() => navClass(view === "list")}
                to="/profile/list"
              >
                My list
              </NavLink>
            </aside>
          )}
          <div className="min-w-0 space-y-6">
            {view === "profile" && (
              <Tabs
                className="space-y-4 rounded-2xl bg-white p-5 shadow-lg"
                defaultValue="details"
              >
                <div>
                  <h2 className="text-xl font-bold text-lighter-black">
                    Profile settings
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your profile and personal appearance.
                  </p>
                </div>
                <TabsList
                  aria-label="Profile settings"
                  className="h-auto rounded-lg p-1"
                >
                  <TabsTrigger
                    className="rounded-md px-3 py-2 text-sm"
                    value="details"
                  >
                    Profile details
                  </TabsTrigger>
                  <TabsTrigger
                    className="rounded-md px-3 py-2 text-sm"
                    value="appearance"
                  >
                    Appearance
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="details">
                  <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={saveProfile}
                  >
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      Your birth year stays private; sharing an age label is
                      optional.
                    </p>
                    <Input
                      aria-label="Display name"
                      className="h-11 rounded-lg px-3"
                      maxLength={80}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Display name"
                      required
                      value={displayName}
                    />
                    <Input
                      aria-label="Birth year"
                      className="h-11 rounded-lg px-3"
                      max={new Date().getFullYear()}
                      min={1900}
                      onChange={(event) => setBirthYear(event.target.value)}
                      placeholder="Birth year (optional)"
                      type="number"
                      value={birthYear}
                    />
                    <Input
                      aria-label="Favorite items"
                      className="h-11 rounded-lg px-3"
                      onChange={(event) => setFavoriteItems(event.target.value)}
                      placeholder="Favorite items (comma separated)"
                      value={favoriteItems}
                    />
                    <Input
                      aria-label="Things you like"
                      className="h-11 rounded-lg px-3"
                      onChange={(event) =>
                        setThingsTheyLike(event.target.value)
                      }
                      placeholder="Things you like (comma separated)"
                      value={thingsTheyLike}
                    />
                    <div className="space-y-2 sm:col-span-2">
                      <p className="text-sm font-semibold text-lighter-black">
                        Your ornament
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(ORNAMENT_ICONS) as AvatarIcon[]).map(
                          (key) => {
                            const Icon = ORNAMENT_ICONS[key]
                            return (
                              <button
                                aria-label={`Ornament icon ${key}`}
                                aria-pressed={avatarIcon === key}
                                className={`flex size-10 items-center justify-center rounded-lg border ${avatarIcon === key ? "border-accent-red ring-2 ring-accent-red/30" : "border-border"}`}
                                key={key}
                                onClick={() => setAvatarIcon(key)}
                                style={{ backgroundColor: avatarColor }}
                                type="button"
                              >
                                <Icon
                                  aria-hidden="true"
                                  className="size-5 text-white"
                                />
                              </button>
                            )
                          }
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ORNAMENT_COLORS.map((color) => (
                          <button
                            aria-label={`Ornament color ${color}`}
                            aria-pressed={avatarColor === color}
                            className={`size-8 rounded-full border-2 ${avatarColor === color ? "border-lighter-black" : "border-white shadow"}`}
                            key={color}
                            onClick={() => setAvatarColor(color)}
                            style={{ backgroundColor: color }}
                            type="button"
                          />
                        ))}
                      </div>
                      <Button
                        className="gap-2 rounded-lg"
                        disabled
                        title="Photo upload is coming soon"
                        type="button"
                        variant="outline"
                      >
                        <ImagePlus aria-hidden="true" className="size-4" />
                        Use my photo (coming soon)
                      </Button>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-lighter-black sm:col-span-2">
                      <input
                        checked={shareAge}
                        onChange={(event) => setShareAge(event.target.checked)}
                        type="checkbox"
                      />
                      Share an approximate age with family members
                    </label>
                    <Button
                      className="w-fit rounded-lg"
                      disabled={isSubmitting}
                      type="submit"
                      variant="outline"
                    >
                      Save profile
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="appearance">
                  <fieldset className="personal-theme-options space-y-3">
                    <legend className="text-sm font-semibold text-lighter-black">
                      Your app theme
                    </legend>
                    <p className="text-sm text-muted-foreground">
                      Saved to your account and applied only to your view. The
                      Tree page always uses the selected family&apos;s theme.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {appThemes.map((theme) => (
                        <button
                          aria-pressed={appTheme === theme.value}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-lighter-black transition disabled:opacity-60 ${appTheme === theme.value ? "border-accent-red ring-2 ring-accent-red/30" : "border-border"}`}
                          disabled={isLoading || isSavingTheme}
                          key={theme.value}
                          onClick={() => void updateAppTheme(theme.value)}
                          type="button"
                        >
                          <span
                            aria-hidden="true"
                            className="size-4 rounded-full border border-black/20"
                            style={{ backgroundColor: theme.color }}
                          />
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </TabsContent>
              </Tabs>
            )}
            {view === "list" && activeFamily && (
              <section className="space-y-5 rounded-2xl bg-white p-5 shadow-lg sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <p className="font-mono text-xs tracking-[0.18em] text-accent-red uppercase">
                      {selectedChild?.display_name ??
                        selectedMember?.display_name ??
                        "Family"}{" "}
                      · {activeFamily.year}
                    </p>
                    <h2 className="text-2xl font-bold text-lighter-black">
                      Wish list
                    </h2>
                    {selectedChild && selectedMember && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Child of {selectedMember.display_name}
                      </p>
                    )}
                    {!selectedChild && selectedMember && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedMember.favorite_items.length > 0 &&
                          `Favorites: ${selectedMember.favorite_items.join(", ")}`}
                        {selectedMember.things_they_like.length > 0 &&
                          ` · Likes: ${selectedMember.things_they_like.join(", ")}`}
                      </p>
                    )}
                  </div>
                  {listOwnerId !== user.id && (
                    <Button
                      className="rounded-lg"
                      onClick={() => navigate("/tree")}
                      variant="outline"
                    >
                      Back to tree
                    </Button>
                  )}
                </div>

                {childId && !selectedChild ? (
                  <p className="text-sm text-muted-foreground">
                    {detailsFamilyId !== activeFamily.id
                      ? "Loading child profile…"
                      : "This child profile is not available in this family."}
                  </p>
                ) : (
                  <WishList
                    key={`${activeFamily.id}:${listOwnerId}:${childId ?? ""}`}
                    client={client}
                    familyId={activeFamily.id}
                    familyYear={activeFamily.year}
                    ownerId={listOwnerId}
                    childId={childId ?? null}
                    userId={user.id}
                    lists={details.lists}
                    gifts={details.gifts}
                    claims={details.claims}
                    teamUps={details.teamUps}
                    pendingId={pendingId}
                    loading={detailsFamilyId !== activeFamily.id}
                    refresh={() => refreshDetails(activeFamily.id)}
                    claimGift={claimGift}
                    releaseClaim={releaseClaim}
                    createTeamUp={createTeamUp}
                  />
                )}
                <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <Gift
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-accent-red"
                  />
                  The gift owner cannot see claims or team-up activity. This is
                  enforced by database row-level security.
                </p>
              </section>
            )}
          </div>
        </div>
      )}
      {view === "team-ups" && activeFamily && (
        <section className="page-transition space-y-4 rounded-2xl bg-white p-5 shadow-lg sm:p-8">
          <div className="flex items-center gap-3">
            <Users aria-hidden="true" className="size-6 text-accent-red" />
            <div>
              <h2 className="text-2xl font-bold text-lighter-black">
                Family team-ups
              </h2>
              <p className="text-sm text-muted-foreground">
                Coordinate on bigger gifts and record purchase proof.
              </p>
            </div>
          </div>
          {myTeamUps.length === 0 ? (
            <p className="rounded-xl bg-muted p-5 text-sm text-muted-foreground">
              No team-ups yet. You'll see one here when someone invites you.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myTeamUps.map((teamUp) => {
                const gift = details.gifts.find(
                  (item) => item.id === teamUp.gift_id
                )
                if (!gift) return null
                const rows = details.teamUpMembers.filter(
                  (member) => member.team_up_id === teamUp.id
                )
                const nameOf = (id: string) =>
                  memberById.get(id)?.display_name ?? "Family member"
                const list = details.lists.find(
                  (item) => item.id === gift.list_id
                )
                const child = details.children.find(
                  (item) => item.id === list?.child_id
                )
                const confirmed = rows.filter((row) => row.confirmed_at)
                const pending = rows.filter((row) => !row.confirmed_at)
                const myRow = rows.find((row) => row.user_id === user.id)
                const isConfirmed = Boolean(myRow?.confirmed_at)
                const invitable = details.members.filter(
                  (member) =>
                    member.id !== gift.owner_id &&
                    !rows.some((row) => row.user_id === member.id)
                )
                return (
                  <article
                    className="space-y-3 rounded-xl border border-border p-4"
                    key={teamUp.id}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">{gift.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Wanted by{" "}
                          {child?.display_name ?? nameOf(gift.owner_id)} ·{" "}
                          {confirmed.length} confirmed
                        </p>
                      </div>
                      <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                        {teamUp.status === "funded"
                          ? "Purchased"
                          : isConfirmed
                            ? "Open"
                            : "Invited"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      In:{" "}
                      {confirmed.map((row) => nameOf(row.user_id)).join(", ")}
                      {pending.length > 0 &&
                        ` · Waiting on: ${pending.map((row) => nameOf(row.user_id)).join(", ")}`}
                      {gift.price !== null &&
                        ` · about $${(Number(gift.price) / Math.max(1, confirmed.length)).toFixed(2)} per person`}
                    </p>
                    {teamUp.status === "open" && !isConfirmed && (
                      <Button
                        className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/80"
                        disabled={pendingId === teamUp.id}
                        onClick={() => void confirmTeamUp(teamUp.id)}
                      >
                        Confirm I&apos;m in
                      </Button>
                    )}
                    {teamUp.status === "open" && isConfirmed && (
                      <>
                        {invitable.length > 0 && (
                          <div className="flex gap-2">
                            <select
                              aria-label="Invite a family member"
                              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-2 text-sm"
                              onChange={(event) =>
                                setInviteTargets((current) => ({
                                  ...current,
                                  [teamUp.id]: event.target.value,
                                }))
                              }
                              value={inviteTargets[teamUp.id] ?? ""}
                            >
                              <option value="">Invite someone…</option>
                              {invitable.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.display_name}
                                </option>
                              ))}
                            </select>
                            <Button
                              className="rounded-lg"
                              disabled={
                                pendingId === teamUp.id ||
                                !inviteTargets[teamUp.id]
                              }
                              onClick={() => void inviteToTeamUp(teamUp.id)}
                              variant="outline"
                            >
                              Invite
                            </Button>
                          </div>
                        )}
                        <form
                          className="flex gap-2"
                          onSubmit={(event) =>
                            void completeTeamUp(event, teamUp.id)
                          }
                        >
                          <Input
                            aria-label="Purchase proof link"
                            className="h-10 min-w-0 rounded-lg px-2 text-sm"
                            onChange={(event) =>
                              setProofUrls((current) => ({
                                ...current,
                                [teamUp.id]: event.target.value,
                              }))
                            }
                            placeholder="Purchase proof link"
                            type="url"
                            value={proofUrls[teamUp.id] ?? ""}
                          />
                          <Button
                            className="rounded-lg"
                            disabled={pendingId === teamUp.id}
                            type="submit"
                          >
                            Mark purchased
                          </Button>
                        </form>
                      </>
                    )}
                    {teamUp.purchase_proof_url && (
                      <a
                        className="text-sm text-accent-red underline"
                        href={teamUp.purchase_proof_url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View purchase proof
                      </a>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
