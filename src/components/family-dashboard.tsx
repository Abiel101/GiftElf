import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react"
import {
  Check,
  Copy,
  ExternalLink,
  Gift,
  Plus,
  Trash2,
  Users,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import type { User } from "@supabase/supabase-js"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { gifts as originalWishList } from "@/data/gifts"
import type { Database, GiftCategory } from "@/lib/database.types"
import type { GiftElfSupabaseClient } from "@/lib/supabase"

type FamilyRow = Database["public"]["Tables"]["families"]["Row"]
type MemberRow = Database["public"]["Tables"]["family_members"]["Row"]
type GiftRow = Database["public"]["Tables"]["gifts"]["Row"]
type ClaimRow = Database["public"]["Tables"]["claims"]["Row"]
type TeamUpRow = Database["public"]["Tables"]["team_ups"]["Row"]
type TeamUpMemberRow = Database["public"]["Tables"]["team_up_members"]["Row"]
type InviteRow = Database["public"]["Tables"]["family_invites"]["Row"]
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]
type FamilySummary = FamilyRow & Pick<MemberRow, "role">
type FamilyProfile = Pick<
  ProfileRow,
  "id" | "display_name" | "avatar_color" | "favorite_items" | "things_they_like"
> & { role: MemberRow["role"]; age_label: string | null }
type FamilyDetails = {
  gifts: GiftRow[]
  members: FamilyProfile[]
  invites: InviteRow[]
  claims: ClaimRow[]
  teamUps: TeamUpRow[]
  teamUpMembers: TeamUpMemberRow[]
}
type DashboardView = "family" | "list" | "team-ups"
type PriceFilter = "all" | "under25" | "25to50" | "50to100" | "100plus"
type GiftForm = {
  title: string
  url: string
  price: string
  category: GiftCategory
  notes: string
}

type FamilyDashboardProps = {
  client: GiftElfSupabaseClient
  user: User
  onSignOut: () => Promise<void>
}

const categories: { value: GiftCategory; label: string }[] = [
  { value: "want", label: "Wants" },
  { value: "need", label: "Needs" },
  { value: "gift_card", label: "Gift cards" },
  { value: "nice_to_have", label: "Nice-to-have" },
]
const priceFilters: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "under25", label: "Under $25" },
  { value: "25to50", label: "$25–50" },
  { value: "50to100", label: "$50–100" },
  { value: "100plus", label: "$100+" },
]
const blankGift: GiftForm = {
  title: "",
  url: "",
  price: "",
  category: "want",
  notes: "",
}
const appStartedAt = Date.now()

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

function storeFromUrl(value: string) {
  if (!value) return null
  try {
    return new URL(value).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

function categoryFromLegacy(category: string): GiftCategory {
  const normalized = category.toLowerCase()
  if (normalized.includes("card")) return "gift_card"
  if (normalized.includes("need") || normalized.includes("health"))
    return "need"
  if (normalized.includes("extra") || normalized.includes("nice"))
    return "nice_to_have"
  return "want"
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
    .select("id,display_name,avatar_color,favorite_items,things_they_like")
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
  const [familyName, setFamilyName] = useState("")
  const [familyYear, setFamilyYear] = useState(String(new Date().getFullYear()))
  const [inviteCode, setInviteCode] = useState(
    () => new URLSearchParams(window.location.search).get("join") ?? ""
  )
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [giftForm, setGiftForm] = useState<GiftForm>(blankGift)
  const [view, setView] = useState<DashboardView>("family")
  const [listOwnerId, setListOwnerId] = useState(user.id)
  const [category, setCategory] = useState<GiftCategory>("want")
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all")
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingId, setPendingId] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [notice, setNotice] = useState("")

  const activeFamily = families.find((family) => family.id === activeFamilyId)
  const memberById = useMemo(
    () => new Map(details.members.map((member) => [member.id, member])),
    [details.members]
  )
  const claimsByGift = useMemo(
    () => new Map(details.claims.map((claim) => [claim.gift_id, claim])),
    [details.claims]
  )
  const teamUpByGift = useMemo(
    () => new Map(details.teamUps.map((teamUp) => [teamUp.gift_id, teamUp])),
    [details.teamUps]
  )

  function clearFamilyDetails() {
    setDetails({
      gifts: [],
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
      setDetails(await fetchFamilyDetails(client, familyId))
    },
    [client]
  )

  useEffect(() => {
    let active = true
    Promise.all([
      client
        .from("profiles")
        .select("display_name,favorite_items,things_they_like")
        .eq("id", user.id)
        .maybeSingle(),
      client
        .from("profile_private")
        .select("birth_year,share_age")
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
        setFavoriteItems(profileResult.data?.favorite_items.join(", ") ?? "")
        setThingsTheyLike(profileResult.data?.things_they_like.join(", ") ?? "")
        setBirthYear(privateResult.data?.birth_year?.toString() ?? "")
        setShareAge(privateResult.data?.share_age ?? false)
        setFamilies(nextFamilies)
        setActiveFamilyId((current) =>
          nextFamilies.some((family) => family.id === current)
            ? current
            : (nextFamilies[0]?.id ?? "")
        )
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(messageFromError(error))
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
        if (active) setDetails(nextDetails)
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(messageFromError(error))
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
          event: "*",
          schema: "public",
          table: "family_members",
          filter: `family_id=eq.${activeFamilyId}`,
        },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            setErrorMessage(messageFromError(error))
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
            setErrorMessage(messageFromError(error))
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
            setErrorMessage(messageFromError(error))
          )
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "claims" },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            setErrorMessage(messageFromError(error))
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
            setErrorMessage(messageFromError(error))
          )
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_up_members" },
        () =>
          void refreshDetails(activeFamilyId).catch((error: unknown) =>
            setErrorMessage(messageFromError(error))
          )
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [activeFamilyId, client, refreshDetails])

  function reportError(error: unknown) {
    setErrorMessage(messageFromError(error))
    setNotice("")
  }

  async function createFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage("")
    setNotice("")
    try {
      const { data, error } = await client.rpc("create_family", {
        p_name: familyName.trim(),
        p_year: Number(familyYear),
      })
      if (error) throw new Error(error.message)
      const created = data[0]
      if (!created) throw new Error("Supabase did not return the new family.")
      await refreshFamilies()
      clearFamilyDetails()
      setActiveFamilyId(created.family_id)
      setFamilyName("")
      setNotice(`Created ${created.name} (${created.year}).`)
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function joinFamily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage("")
    setNotice("")
    try {
      const { data, error } = await client.rpc("join_family", {
        p_invite_code: inviteCode.trim(),
      })
      if (error) throw new Error(error.message)
      const joined = data[0]
      if (!joined) throw new Error("Supabase did not return the joined family.")
      await refreshFamilies()
      clearFamilyDetails()
      setActiveFamilyId(joined.family_id)
      setInviteCode("")
      setNotice(`You joined ${joined.name} (${joined.year}).`)
      window.history.replaceState({}, "", window.location.pathname)
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage("")
    setNotice("")
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
      setNotice("Your profile was saved.")
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeFamily) return
    setIsSubmitting(true)
    setErrorMessage("")
    setNotice("")
    try {
      const { error } = await client.rpc("create_family_invite", {
        p_family_id: activeFamily.id,
        p_display_name: inviteName.trim(),
        p_email: inviteEmail.trim(),
      })
      if (error) throw new Error(error.message)
      setInviteName("")
      setInviteEmail("")
      setNotice(
        "Pending family member added. Share the family code so they can join."
      )
      await refreshDetails(activeFamily.id)
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function copyInviteLink() {
    if (!activeFamily) return
    const link = `${window.location.origin}/?join=${encodeURIComponent(activeFamily.invite_code)}`
    try {
      await navigator.clipboard.writeText(link)
      setNotice("Family invite link copied.")
      setErrorMessage("")
    } catch (error) {
      reportError(error)
    }
  }

  async function addGift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeFamily) return
    const url = normalizeWebUrl(giftForm.url)
    if (giftForm.url.trim() && !url) {
      reportError(new Error("Gift links must start with http:// or https://."))
      return
    }
    const price = giftForm.price.trim() ? Number(giftForm.price) : null
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      reportError(new Error("Enter a valid non-negative price."))
      return
    }
    setIsSubmitting(true)
    setErrorMessage("")
    setNotice("")
    try {
      const { error } = await client.from("gifts").insert({
        family_id: activeFamily.id,
        owner_id: user.id,
        title: giftForm.title.trim(),
        url,
        store: storeFromUrl(url ?? ""),
        price,
        category: giftForm.category,
        notes: giftForm.notes.trim() || null,
      })
      if (error) throw new Error(error.message)
      setGiftForm(blankGift)
      setNotice("Added to your wish list.")
      await refreshDetails(activeFamily.id)
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function importOriginalList() {
    if (!activeFamily) return
    setIsSubmitting(true)
    setErrorMessage("")
    setNotice("")
    try {
      const { data: existing, error: existingError } = await client
        .from("gifts")
        .select("title")
        .eq("family_id", activeFamily.id)
        .eq("owner_id", user.id)
      if (existingError) throw new Error(existingError.message)
      const existingTitles = new Set(existing.map((gift) => gift.title))
      const giftsToAdd = originalWishList
        .filter((gift) => !existingTitles.has(gift.title))
        .map((gift) => ({
          family_id: activeFamily.id,
          owner_id: user.id,
          title: gift.title,
          url: normalizeWebUrl(gift.link),
          store: storeFromUrl(gift.link),
          price: Number(gift.price.replace(/[^0-9.]/g, "")) || null,
          category: categoryFromLegacy(gift.category),
          image_url: gift.image,
        }))
      if (giftsToAdd.length === 0) {
        setNotice("Your original list is already imported.")
        return
      }
      const { error } = await client.from("gifts").insert(giftsToAdd)
      if (error) throw new Error(error.message)
      setNotice(`Imported ${giftsToAdd.length} gifts from your original list.`)
      await refreshDetails(activeFamily.id)
    } catch (error) {
      reportError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function claimGift(giftId: string) {
    setPendingId(giftId)
    setErrorMessage("")
    setNotice("")
    try {
      const { error } = await client.rpc("claim_gift", { p_gift_id: giftId })
      if (error) throw new Error(error.message)
      setNotice(
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
    setErrorMessage("")
    try {
      const { error } = await client.rpc("release_gift_claim", {
        p_gift_id: giftId,
      })
      if (error) throw new Error(error.message)
      setNotice("Your claim was removed.")
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  async function deleteGift(giftId: string) {
    if (!activeFamily) return
    setPendingId(giftId)
    setErrorMessage("")
    try {
      const { error } = await client
        .from("gifts")
        .delete()
        .eq("id", giftId)
        .eq("owner_id", user.id)
      if (error) throw new Error(error.message)
      setNotice("Gift removed from your list.")
      await refreshDetails(activeFamily.id)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  async function createTeamUp(giftId: string) {
    setPendingId(giftId)
    setErrorMessage("")
    try {
      const { error } = await client.rpc("create_team_up", {
        p_gift_id: giftId,
      })
      if (error) throw new Error(error.message)
      setNotice("Team-up created. Other family members can join.")
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  async function joinTeamUp(teamUpId: string) {
    setPendingId(teamUpId)
    setErrorMessage("")
    try {
      const { error } = await client.rpc("join_team_up", {
        p_team_up_id: teamUpId,
        p_pledge: null,
      })
      if (error) throw new Error(error.message)
      setNotice("You joined the team-up.")
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
    setErrorMessage("")
    try {
      const { error } = await client.rpc("complete_team_up", {
        p_team_up_id: teamUpId,
        p_purchase_proof_url: proofUrl,
      })
      if (error) throw new Error(error.message)
      setNotice("Team-up marked purchased with proof. The gift is now claimed.")
      if (activeFamilyId) await refreshDetails(activeFamilyId)
    } catch (error) {
      reportError(error)
    } finally {
      setPendingId("")
    }
  }

  const selectedMember = memberById.get(listOwnerId)
  const visibleGifts = details.gifts.filter((gift) => {
    if (gift.owner_id !== listOwnerId || gift.category !== category)
      return false
    if (priceFilter === "all" || gift.price === null)
      return priceFilter === "all"
    if (priceFilter === "under25") return gift.price < 25
    if (priceFilter === "25to50") return gift.price >= 25 && gift.price < 50
    if (priceFilter === "50to100") return gift.price >= 50 && gift.price < 100
    return gift.price >= 100
  })

  function openList(ownerId: string) {
    setListOwnerId(ownerId)
    setView("list")
    setCategory("want")
    setPriceFilter("all")
  }

  const navClass = (selected: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold ${selected ? "bg-accent-red text-white" : "bg-white text-lighter-black"}`

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-lighter-black">
              {user.email}
            </p>
            <p className="text-xs text-muted-foreground">
              Your family gift space
            </p>
          </div>
          {families.length > 0 && (
            <label className="text-sm font-medium text-lighter-black">
              <span className="sr-only">Active family</span>
              <select
                className="h-10 rounded-lg border border-border bg-white px-3"
                onChange={(event) => {
                  clearFamilyDetails()
                  setActiveFamilyId(event.target.value)
                }}
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
        </div>
        <div className="flex gap-2">
          <Button
            className="rounded-lg"
            onClick={() => setView("family")}
            variant="outline"
          >
            Profile
          </Button>
          <Button
            className="rounded-lg"
            onClick={() => void onSignOut()}
            variant="outline"
          >
            Sign out
          </Button>
        </div>
      </header>

      {(errorMessage || notice) && (
        <div
          aria-live="polite"
          className={`rounded-lg px-4 py-3 text-sm ${errorMessage ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
        >
          {errorMessage || notice}
        </div>
      )}

      <nav aria-label="Gift Elf sections" className="flex flex-wrap gap-2">
        <button
          className={navClass(view === "family")}
          onClick={() => setView("family")}
          type="button"
        >
          Family
        </button>
        <button
          className={navClass(view === "list" && listOwnerId === user.id)}
          onClick={() => openList(user.id)}
          type="button"
        >
          My List
        </button>
        <button
          className={navClass(view === "team-ups")}
          onClick={() => setView("team-ups")}
          type="button"
        >
          Team-ups
        </button>
      </nav>

      {view === "family" && (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
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
                className="rounded-lg bg-accent-red text-white hover:bg-[#e23e46]"
                disabled={isSubmitting}
                type="submit"
              >
                <Plus aria-hidden="true" className="mr-2 size-4" />
                Create family
              </Button>
            </form>

            <form
              className="space-y-3 rounded-2xl bg-white p-5 shadow-lg"
              onSubmit={joinFamily}
            >
              <h2 className="text-xl font-bold text-lighter-black">
                Join a family
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter a current-year invite code.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  aria-label="Family invite code"
                  autoCapitalize="characters"
                  className="h-11 rounded-lg px-3 uppercase"
                  onChange={(event) =>
                    setInviteCode(event.target.value.toUpperCase())
                  }
                  placeholder="Paste family code"
                  required
                  value={inviteCode}
                />
                <Button
                  className="h-11 rounded-lg bg-lighter-black text-white hover:bg-black"
                  disabled={isSubmitting}
                  type="submit"
                >
                  Join family
                </Button>
              </div>
            </form>
          </div>

          <form
            className="grid gap-3 rounded-2xl bg-white p-5 shadow-lg sm:grid-cols-2"
            onSubmit={saveProfile}
          >
            <div className="sm:col-span-2">
              <h2 className="text-xl font-bold text-lighter-black">
                Your profile
              </h2>
              <p className="text-sm text-muted-foreground">
                Your birth year stays private; sharing an age label is optional.
              </p>
            </div>
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
              onChange={(event) => setThingsTheyLike(event.target.value)}
              placeholder="Things you like (comma separated)"
              value={thingsTheyLike}
            />
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

          {isLoading ? (
            <p className="rounded-xl bg-white p-6 text-sm text-muted-foreground">
              Loading your families…
            </p>
          ) : activeFamily ? (
            <section className="space-y-5 rounded-2xl bg-white p-5 shadow-lg sm:p-8">
              <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-xs tracking-[0.18em] text-accent-red uppercase">
                    {activeFamily.year} · {details.members.length} joined
                  </p>
                  <h2 className="text-2xl font-bold text-lighter-black">
                    {activeFamily.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Christmas is in{" "}
                    {Math.max(
                      0,
                      Math.ceil(
                        (new Date(activeFamily.year, 11, 25).getTime() -
                          appStartedAt) /
                          (1000 * 60 * 60 * 24)
                      )
                    )}{" "}
                    days
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-xl border border-border p-3">
                  <QRCodeSVG
                    aria-label="Family invite QR code"
                    size={112}
                    value={`${window.location.origin}/?join=${encodeURIComponent(activeFamily.invite_code)}`}
                  />
                  <span className="font-mono text-xs font-semibold">
                    {activeFamily.invite_code}
                  </span>
                  <Button
                    className="gap-2 rounded-lg"
                    onClick={() => void copyInviteLink()}
                    size="sm"
                    variant="outline"
                  >
                    <Copy aria-hidden="true" className="size-4" />
                    Copy invite link
                  </Button>
                  <span className="max-w-40 text-center text-xs text-muted-foreground">
                    Expires{" "}
                    {new Date(
                      activeFamily.invite_code_expires_at
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {details.members.map((member) => (
                  <button
                    aria-label={`View ${member.display_name}'s wish list${member.age_label ? `, ${member.age_label}` : ""}`}
                    className="flex w-24 flex-col items-center gap-2 rounded-xl p-3 text-center transition hover:bg-[#fff3f3]"
                    key={member.id}
                    onClick={() => openList(member.id)}
                    type="button"
                  >
                    <span
                      className="flex size-16 items-center justify-center rounded-full border-4 border-white text-xl font-bold text-white shadow"
                      style={{ backgroundColor: member.avatar_color }}
                    >
                      {member.display_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-sm font-semibold text-lighter-black">
                      {member.display_name}
                    </span>
                    {member.age_label && (
                      <span className="text-xs text-muted-foreground">
                        {member.age_label}
                      </span>
                    )}
                    <span
                      className="size-2 rounded-full bg-green-500"
                      aria-label="Joined"
                    />
                  </button>
                ))}
                {details.invites.map((invite) => (
                  <div
                    className="flex w-24 flex-col items-center gap-2 p-3 text-center opacity-60"
                    key={invite.id}
                  >
                    <span className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground text-xl text-muted-foreground">
                      {invite.display_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {invite.display_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Pending
                    </span>
                  </div>
                ))}
              </div>

              {activeFamily.role === "owner" && (
                <form
                  className="grid gap-3 border-t border-border pt-5 sm:grid-cols-[1fr_1fr_auto]"
                  onSubmit={createInvite}
                >
                  <Input
                    aria-label="Invitee name"
                    className="h-11 rounded-lg px-3"
                    maxLength={80}
                    onChange={(event) => setInviteName(event.target.value)}
                    placeholder="Invitee name"
                    required
                    value={inviteName}
                  />
                  <Input
                    aria-label="Invitee email"
                    className="h-11 rounded-lg px-3"
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="Invitee email"
                    required
                    type="email"
                    value={inviteEmail}
                  />
                  <Button
                    className="h-11 rounded-lg"
                    disabled={isSubmitting}
                    type="submit"
                    variant="outline"
                  >
                    <Users aria-hidden="true" className="mr-2 size-4" />
                    Add pending member
                  </Button>
                </form>
              )}
            </section>
          ) : (
            <p className="rounded-xl bg-white p-6 text-sm text-muted-foreground">
              You haven&apos;t joined a family yet. Create one or use an invite
              code to get started.
            </p>
          )}
        </>
      )}

      {view === "list" && activeFamily && (
        <section className="space-y-5 rounded-2xl bg-white p-5 shadow-lg sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="font-mono text-xs tracking-[0.18em] text-accent-red uppercase">
                {selectedMember?.display_name ?? "Family"} · {activeFamily.year}
              </p>
              <h2 className="text-2xl font-bold text-lighter-black">
                Wish list
              </h2>
              {selectedMember && (
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
                onClick={() => setView("family")}
                variant="outline"
              >
                Back to family
              </Button>
            )}
          </div>

          {listOwnerId === user.id && (
            <form
              className="grid gap-3 rounded-xl bg-[#f8f8f8] p-4 sm:grid-cols-2 lg:grid-cols-5"
              onSubmit={addGift}
            >
              <Input
                aria-label="Gift title"
                className="h-11 rounded-lg bg-white px-3"
                maxLength={120}
                onChange={(event) =>
                  setGiftForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Gift idea"
                required
                value={giftForm.title}
              />
              <select
                aria-label="Gift category"
                className="h-11 rounded-lg border border-border bg-white px-3 text-sm"
                onChange={(event) =>
                  setGiftForm((current) => ({
                    ...current,
                    category: event.target.value as GiftCategory,
                  }))
                }
                value={giftForm.category}
              >
                {categories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Gift price in dollars"
                className="h-11 rounded-lg bg-white px-3"
                min="0"
                onChange={(event) =>
                  setGiftForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="Price ($)"
                step="0.01"
                type="number"
                value={giftForm.price}
              />
              <Input
                aria-label="Product link"
                className="h-11 rounded-lg bg-white px-3"
                onChange={(event) =>
                  setGiftForm((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
                placeholder="Product link"
                type="url"
                value={giftForm.url}
              />
              <Input
                aria-label="Gift note"
                className="h-11 rounded-lg bg-white px-3"
                onChange={(event) =>
                  setGiftForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Optional note"
                value={giftForm.notes}
              />
              <Button
                className="rounded-lg bg-accent-red text-white hover:bg-[#e23e46]"
                disabled={isSubmitting}
                type="submit"
              >
                <Plus aria-hidden="true" className="mr-2 size-4" />
                Add gift
              </Button>
              <Button
                className="rounded-lg"
                disabled={isSubmitting}
                onClick={() => void importOriginalList()}
                type="button"
                variant="outline"
              >
                Import original list
              </Button>
            </form>
          )}

          <div className="flex flex-wrap gap-2">
            {categories.map((option) => (
              <button
                className={navClass(category === option.value)}
                key={option.value}
                onClick={() => setCategory(option.value)}
                type="button"
              >
                {option.label} (
                {
                  details.gifts.filter(
                    (gift) =>
                      gift.owner_id === listOwnerId &&
                      gift.category === option.value
                  ).length
                }
                )
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {priceFilters.map((option) => (
              <button
                className={`${navClass(priceFilter === option.value)} border border-border`}
                key={option.value}
                onClick={() => setPriceFilter(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          {visibleGifts.length === 0 ? (
            <p className="rounded-xl bg-[#f8f8f8] p-6 text-sm text-muted-foreground">
              No gifts in this category and price range yet.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleGifts.map((gift) => {
                const claim = claimsByGift.get(gift.id)
                const teamUp = teamUpByGift.get(gift.id)
                const isOwner = gift.owner_id === user.id
                const isParticipant = Boolean(
                  teamUp &&
                  details.teamUpMembers.some(
                    (member) =>
                      member.team_up_id === teamUp.id &&
                      member.user_id === user.id
                  )
                )
                return (
                  <article
                    className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm"
                    key={gift.id}
                  >
                    {gift.image_url && (
                      <img
                        alt=""
                        className="h-40 w-full rounded-lg object-cover"
                        src={gift.image_url}
                      />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-lighter-black">
                          {gift.title}
                        </h3>
                        {gift.store && (
                          <p className="text-xs text-muted-foreground">
                            {gift.store}
                          </p>
                        )}
                      </div>
                      {gift.price !== null && (
                        <span className="shrink-0 rounded-full bg-[#fff3d4] px-3 py-1 text-sm font-bold text-lighter-black">
                          ${Number(gift.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {gift.notes && (
                      <p className="text-sm text-muted-foreground">
                        {gift.notes}
                      </p>
                    )}
                    {gift.url && (
                      <a
                        className="inline-flex items-center gap-1 text-sm font-semibold text-accent-red underline-offset-4 hover:underline"
                        href={gift.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        View gift{" "}
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </a>
                    )}
                    {isOwner ? (
                      <Button
                        aria-label={`Remove ${gift.title}`}
                        className="w-full rounded-lg"
                        disabled={pendingId === gift.id}
                        onClick={() => void deleteGift(gift.id)}
                        variant="outline"
                      >
                        <Trash2 aria-hidden="true" className="mr-2 size-4" />
                        Remove from my list
                      </Button>
                    ) : claim ? (
                      claim.claimed_by === user.id ? (
                        <Button
                          className="w-full rounded-lg"
                          disabled={pendingId === gift.id}
                          onClick={() => void releaseClaim(gift.id)}
                          variant="outline"
                        >
                          <Check aria-hidden="true" className="mr-2 size-4" />
                          You&apos;re getting this · Undo
                        </Button>
                      ) : (
                        <p className="rounded-lg bg-[#f3f3f3] px-3 py-2 text-center text-sm text-muted-foreground">
                          Already taken
                        </p>
                      )
                    ) : teamUp ? (
                      <div className="space-y-2 rounded-lg bg-[#f3f8f4] p-3 text-sm">
                        <p className="font-semibold text-lighter-black">
                          {teamUp.status === "funded" ? "Purchased" : "Team-up"}{" "}
                          ·{" "}
                          {
                            details.teamUpMembers.filter(
                              (member) => member.team_up_id === teamUp.id
                            ).length
                          }{" "}
                          joined
                          {gift.price !== null &&
                            details.teamUpMembers.some(
                              (member) => member.team_up_id === teamUp.id
                            ) &&
                            ` · about $${(Number(gift.price) / Math.max(1, details.teamUpMembers.filter((member) => member.team_up_id === teamUp.id).length)).toFixed(2)} each`}
                        </p>
                        {teamUp.status === "open" && !isParticipant && (
                          <Button
                            className="w-full rounded-lg"
                            disabled={pendingId === teamUp.id}
                            onClick={() => void joinTeamUp(teamUp.id)}
                            variant="outline"
                          >
                            Join team-up
                          </Button>
                        )}
                        {teamUp.status === "open" && isParticipant && (
                          <form
                            className="flex gap-2"
                            onSubmit={(event) =>
                              void completeTeamUp(event, teamUp.id)
                            }
                          >
                            <Input
                              aria-label="Purchase proof link"
                              className="h-10 min-w-0 rounded-lg bg-white px-2 text-sm"
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
                              Purchased
                            </Button>
                          </form>
                        )}
                        {teamUp.purchase_proof_url && (
                          <a
                            className="text-accent-red underline"
                            href={teamUp.purchase_proof_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View purchase proof
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 rounded-lg bg-accent-red text-white hover:bg-[#e23e46]"
                          disabled={pendingId === gift.id}
                          onClick={() => void claimGift(gift.id)}
                        >
                          I&apos;ll get this
                        </Button>
                        {gift.price !== null && gift.price >= 60 && (
                          <Button
                            aria-label={`Start a team-up for ${gift.title}`}
                            className="rounded-lg"
                            disabled={pendingId === gift.id}
                            onClick={() => void createTeamUp(gift.id)}
                            variant="outline"
                          >
                            Team up
                          </Button>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
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

      {view === "team-ups" && activeFamily && (
        <section className="space-y-4 rounded-2xl bg-white p-5 shadow-lg sm:p-8">
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
          {details.teamUps.length === 0 ? (
            <p className="rounded-xl bg-[#f8f8f8] p-5 text-sm text-muted-foreground">
              No team-ups yet. Start one from a gift priced at $60 or more.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {details.teamUps.map((teamUp) => {
                const gift = details.gifts.find(
                  (item) => item.id === teamUp.gift_id
                )
                if (!gift) return null
                const participants = details.teamUpMembers
                  .filter((member) => member.team_up_id === teamUp.id)
                  .map((member) => memberById.get(member.user_id)?.display_name)
                  .filter((name): name is string => Boolean(name))
                const participantCount = participants.length
                const isParticipant = details.teamUpMembers.some(
                  (member) =>
                    member.team_up_id === teamUp.id &&
                    member.user_id === user.id
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
                          {memberById.get(gift.owner_id)?.display_name ??
                            "family member"}{" "}
                          · {participantCount} joined
                        </p>
                      </div>
                      <span className="rounded-full bg-[#fff3d4] px-3 py-1 text-sm font-semibold">
                        {teamUp.status === "funded" ? "Purchased" : "Open"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Joined by: {participants.join(", ") || "No one yet"}
                      {gift.price !== null &&
                        ` · about $${(Number(gift.price) / Math.max(1, participantCount)).toFixed(2)} per person`}
                    </p>
                    {teamUp.status === "open" && !isParticipant && (
                      <Button
                        className="rounded-lg"
                        disabled={pendingId === teamUp.id}
                        onClick={() => void joinTeamUp(teamUp.id)}
                        variant="outline"
                      >
                        Join team-up
                      </Button>
                    )}
                    {teamUp.status === "open" && isParticipant && (
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
