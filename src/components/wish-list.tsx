import { useState, type FormEvent } from "react"
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { ExternalLink, Plus, Trash2 } from "lucide-react"
import { NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { gifts as originalWishList } from "@/data/gifts"
import type { Database, GiftCategory } from "@/lib/database.types"
import { fetchLinkPreview } from "@/lib/link-preview"
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications"
import type { GiftElfSupabaseClient } from "@/lib/supabase"

type Gift = Database["public"]["Tables"]["gifts"]["Row"]
type List = Database["public"]["Tables"]["wish_lists"]["Row"]
type Claim = Database["public"]["Tables"]["claims"]["Row"]
type TeamUp = Database["public"]["Tables"]["team_ups"]["Row"]

type Props = {
  client: GiftElfSupabaseClient
  familyId: string
  ownerId: string
  childId: string | null
  userId: string
  lists: List[]
  gifts: Gift[]
  claims: Claim[]
  teamUps: TeamUp[]
  pendingId: string
  refresh: () => Promise<void>
  claimGift: (id: string) => Promise<void>
  releaseClaim: (id: string) => Promise<void>
  createTeamUp: (id: string) => Promise<void>
}

type GiftForm = {
  title: string
  url: string
  image: string
  price: string
  category: GiftCategory
  notes: string
}

const blankGift: GiftForm = {
  title: "",
  url: "",
  image: "",
  price: "",
  category: "want",
  notes: "",
}

const categories: { value: GiftCategory; label: string }[] = [
  { value: "want", label: "Wants" },
  { value: "need", label: "Needs" },
  { value: "gift_card", label: "Gift cards" },
  { value: "nice_to_have", label: "Nice-to-have" },
]

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
})
const column = createColumnHelper<typeof features, Gift>()
const columns = column.columns([
  column.accessor("title", { header: "Item" }),
  column.accessor("notes", { header: "Description" }),
  column.accessor("category", { header: "Category" }),
  column.accessor("price", { header: "Price" }),
])

function webUrl(value: string) {
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

function categoryFromLegacy(category: string): GiftCategory {
  const normalized = category.toLowerCase()
  if (normalized.includes("card")) return "gift_card"
  if (normalized.includes("need") || normalized.includes("health"))
    return "need"
  if (normalized.includes("extra") || normalized.includes("nice"))
    return "nice_to_have"
  return "want"
}

export function WishList({
  client,
  familyId,
  ownerId,
  childId,
  userId,
  lists,
  gifts,
  claims,
  teamUps,
  pendingId,
  refresh,
  claimGift,
  releaseClaim,
  createTeamUp,
}: Props) {
  const own = ownerId === userId
  const ownerLists = lists.filter(
    (list) => list.owner_id === ownerId && list.child_id === childId
  )
  const [listId, setListId] = useState("")
  const selectedList =
    ownerLists.find((list) => list.id === listId) ?? ownerLists[0]
  const currentListId = selectedList?.id
  const [listName, setListName] = useState("")
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [priceFilter, setPriceFilter] = useState("all")
  const [selected, setSelected] = useState<string[]>([])
  const [form, setForm] = useState<GiftForm>(blankGift)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const term = search.trim().toLowerCase()
  const filtered = gifts.filter(
    (gift) =>
      gift.list_id === currentListId &&
      gift.owner_id === ownerId &&
      (categoryFilter === "all" || gift.category === categoryFilter) &&
      (priceFilter === "all" ||
        (gift.price !== null &&
          (priceFilter === "under25"
            ? gift.price < 25
            : priceFilter === "25to50"
              ? gift.price >= 25 && gift.price < 50
              : priceFilter === "50to100"
                ? gift.price >= 50 && gift.price < 100
                : gift.price >= 100))) &&
      [gift.title, gift.notes, gift.category, gift.store].some((value) =>
        value?.toLowerCase().includes(term)
      )
  )
  const table = useTable({
    features,
    columns,
    data: filtered,
    getRowId: (row) => row.id,
  })
  const selectedVisible = filtered.filter((gift) => selected.includes(gift.id))
  const selectedItems = gifts.filter(
    (gift) => gift.list_id === currentListId && selected.includes(gift.id)
  )

  function report(error: unknown) {
    notifyError(
      error instanceof Error
        ? error.message
        : "Something went wrong. Try again."
    )
  }

  async function createList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = listName.trim()
    if (!name) {
      notifyError("Enter a list name.")
      return
    }
    setBusy(true)
    try {
      const { data, error } = await client
        .from("wish_lists")
        .insert({
          family_id: familyId,
          owner_id: userId,
          child_id: childId,
          name,
        })
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      setListId(data.id)
      setListName("")
      setSelected([])
      await refresh()
      notifySuccess("List created. Add your first item.")
    } catch (error) {
      report(error)
    } finally {
      setBusy(false)
    }
  }

  async function saveGift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedList) return
    const url = webUrl(form.url)
    const image = webUrl(form.image)
    if (
      (form.url.trim() && !url) ||
      (form.image.trim() &&
        !image &&
        !/^\/img\/[A-Za-z0-9_.-]+$/.test(form.image))
    ) {
      notifyError(
        "Product and image links must start with http:// or https://."
      )
      return
    }
    const price = form.price.trim() ? Number(form.price) : null
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      notifyError("Enter a valid non-negative price.")
      return
    }
    setBusy(true)
    try {
      const preview =
        !editingId && url ? await fetchLinkPreview(client, url) : null
      const title =
        form.title.trim() ||
        preview?.title ||
        (url ? new URL(url).hostname : "")
      if (!title) throw new Error("Add an item name or product link.")
      const values = {
        title,
        url,
        image_url:
          image ||
          (form.image.startsWith("/img/") ? form.image : null) ||
          preview?.image ||
          null,
        store: url ? new URL(url).hostname.replace(/^www\./, "") : null,
        price,
        category: form.category,
        notes: form.notes.trim() || null,
      }
      const result = editingId
        ? await client
            .from("gifts")
            .update(values)
            .eq("id", editingId)
            .eq("owner_id", userId)
            .eq("list_id", selectedList.id)
        : await client.from("gifts").insert({
            ...values,
            family_id: familyId,
            owner_id: userId,
            list_id: selectedList.id,
          })
      if (result.error) throw new Error(result.error.message)
      setForm(blankGift)
      setEditingId(null)
      setFormOpen(false)
      await refresh()
      notifySuccess(editingId ? "Item updated." : "Added to your list.")
    } catch (error) {
      report(error)
    } finally {
      setBusy(false)
    }
  }

  async function deleteSelected() {
    if (!selectedList || selectedItems.length === 0) return
    if (
      !window.confirm(
        `Delete ${selectedItems.length} selected item(s)? Claims and team-ups for them will also be removed.`
      )
    )
      return
    setBusy(true)
    try {
      const { error } = await client
        .from("gifts")
        .delete()
        .eq("owner_id", userId)
        .eq("list_id", selectedList.id)
        .in(
          "id",
          selectedItems.map((gift) => gift.id)
        )
      if (error) throw new Error(error.message)
      setSelected([])
      await refresh()
      notifySuccess("Selected items deleted.")
    } catch (error) {
      report(error)
    } finally {
      setBusy(false)
    }
  }

  async function importOriginalList() {
    if (!selectedList) return
    setBusy(true)
    try {
      const existing = new Set(
        gifts
          .filter((gift) => gift.list_id === selectedList.id)
          .map((gift) => gift.title)
      )
      const additions = originalWishList
        .filter((gift) => !existing.has(gift.title))
        .map((gift) => ({
          family_id: familyId,
          owner_id: userId,
          list_id: selectedList.id,
          title: gift.title,
          url: webUrl(gift.link),
          store: webUrl(gift.link)
            ? new URL(gift.link).hostname.replace(/^www\./, "")
            : null,
          price: Number(gift.price.replace(/[^0-9.]/g, "")) || null,
          category: categoryFromLegacy(gift.category),
          image_url: gift.image,
        }))
      if (!additions.length) {
        notifyInfo("Your original list is already imported.")
        return
      }
      const { error } = await client.from("gifts").insert(additions)
      if (error) throw new Error(error.message)
      await refresh()
      notifySuccess(`Imported ${additions.length} items.`)
    } catch (error) {
      report(error)
    } finally {
      setBusy(false)
    }
  }

  function edit(gift: Gift) {
    setEditingId(gift.id)
    setForm({
      title: gift.title,
      url: gift.url ?? "",
      image: gift.image_url ?? "",
      price: gift.price?.toString() ?? "",
      category: gift.category,
      notes: gift.notes ?? "",
    })
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      {own && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => void createList(event)}
        >
          <Input
            aria-label="New list name"
            className="max-w-xs rounded-lg"
            maxLength={100}
            onChange={(event) => setListName(event.target.value)}
            placeholder="Name a new list"
            value={listName}
          />
          <Button disabled={busy} type="submit">
            <Plus aria-hidden="true" /> Create list
          </Button>
        </form>
      )}
      {!selectedList ? (
        <p className="rounded-xl bg-muted p-5 text-sm text-muted-foreground">
          {own
            ? "Create a list before adding items."
            : "No lists have been created yet."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold" htmlFor="wish-list-select">
              List
            </label>
            <select
              id="wish-list-select"
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
              value={selectedList.id}
              onChange={(event) => {
                setListId(event.target.value)
                setSelected([])
                setFormOpen(false)
                setEditingId(null)
              }}
            >
              {ownerLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
            <Input
              aria-label="Search items"
              className="max-w-xs rounded-lg"
              placeholder="Search items..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="Filter by category"
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by price"
              className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
              value={priceFilter}
              onChange={(event) => setPriceFilter(event.target.value)}
            >
              <option value="all">All prices</option>
              <option value="under25">Under $25</option>
              <option value="25to50">$25–50</option>
              <option value="50to100">$50–100</option>
              <option value="100plus">$100+</option>
            </select>
            {own && (
              <>
                <Button
                  onClick={() => {
                    setEditingId(null)
                    setForm(blankGift)
                    setFormOpen(true)
                  }}
                  type="button"
                >
                  <Plus aria-hidden="true" /> Add item
                </Button>
                <Button
                  disabled={busy || selectedItems.length === 0}
                  onClick={() => void deleteSelected()}
                  type="button"
                  variant="outline"
                >
                  <Trash2 aria-hidden="true" /> Delete selected (
                  {selectedItems.length})
                </Button>
                {!childId && (
                  <Button
                    disabled={busy}
                    onClick={() => void importOriginalList()}
                    type="button"
                    variant="outline"
                  >
                    Import original list
                  </Button>
                )}
              </>
            )}
          </div>
          {own && formOpen && (
            <form
              className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-2"
              onSubmit={(event) => void saveGift(event)}
            >
              <Input
                aria-label="Item name"
                maxLength={120}
                placeholder="Item name (optional with a link)"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
              />
              <Input
                aria-label="Product link"
                placeholder="Product link"
                type="url"
                value={form.url}
                onChange={(event) =>
                  setForm({ ...form, url: event.target.value })
                }
              />
              <Input
                aria-label="Image link"
                placeholder="Image link (optional)"
                value={form.image}
                onChange={(event) =>
                  setForm({ ...form, image: event.target.value })
                }
              />
              <Input
                aria-label="Price in dollars"
                min="0"
                placeholder="Price ($)"
                step="0.01"
                type="number"
                value={form.price}
                onChange={(event) =>
                  setForm({ ...form, price: event.target.value })
                }
              />
              <select
                aria-label="Category"
                className="h-10 rounded-lg border border-border bg-white px-3 text-sm"
                value={form.category}
                onChange={(event) =>
                  setForm({
                    ...form,
                    category: event.target.value as GiftCategory,
                  })
                }
              >
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Description"
                placeholder="Description or note"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
              />
              <div className="flex gap-2">
                <Button disabled={busy} type="submit">
                  {editingId ? "Save changes" : "Add to list"}
                </Button>
                <Button
                  onClick={() => setFormOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  {own && (
                    <TableHead>
                      <input
                        aria-label="Select all visible items"
                        type="checkbox"
                        checked={
                          filtered.length > 0 &&
                          selectedVisible.length === filtered.length
                        }
                        onChange={(event) => {
                          const checked = event.target.checked
                          setSelected((current) =>
                            checked
                              ? [
                                  ...new Set([
                                    ...current,
                                    ...filtered.map((gift) => gift.id),
                                  ]),
                                ]
                              : current.filter(
                                  (id) =>
                                    !filtered.some((gift) => gift.id === id)
                                )
                          )
                        }}
                      />
                    </TableHead>
                  )}
                  {table.getHeaderGroups().flatMap((group) =>
                    group.headers.map((header) => (
                      <TableHead key={header.id}>
                        <button
                          className="font-semibold"
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          <table.FlexRender header={header} />{" "}
                          {header.column.getIsSorted() === "asc"
                            ? "↑"
                            : header.column.getIsSorted() === "desc"
                              ? "↓"
                              : ""}
                        </button>
                      </TableHead>
                    ))
                  )}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  const gift = row.original
                  const claim = claims.find((item) => item.gift_id === gift.id)
                  const teamUp = teamUps.find(
                    (item) => item.gift_id === gift.id
                  )
                  return (
                    <TableRow key={row.id}>
                      {own && (
                        <TableCell>
                          <input
                            aria-label={`Select ${gift.title}`}
                            type="checkbox"
                            checked={selected.includes(gift.id)}
                            onChange={(event) =>
                              setSelected(
                                event.target.checked
                                  ? [...selected, gift.id]
                                  : selected.filter((id) => id !== gift.id)
                              )
                            }
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {gift.image_url ? (
                            <img
                              alt=""
                              className="size-12 rounded-md object-cover"
                              src={gift.image_url}
                            />
                          ) : (
                            <span
                              aria-hidden="true"
                              className="size-12 rounded-md bg-muted"
                            />
                          )}
                          <div className="max-w-48 font-semibold whitespace-normal">
                            {gift.title}
                            {gift.url && (
                              <a
                                aria-label={`View ${gift.title}`}
                                className="ml-1 inline-block text-accent-red"
                                href={gift.url}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-56 whitespace-normal">
                        {gift.notes || "—"}
                      </TableCell>
                      <TableCell>
                        {
                          categories.find(
                            (category) => category.value === gift.category
                          )?.label
                        }
                      </TableCell>
                      <TableCell>
                        {gift.price === null
                          ? "—"
                          : `$${Number(gift.price).toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        {own ? (
                          <Button
                            onClick={() => edit(gift)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Edit
                          </Button>
                        ) : claim ? (
                          claim.claimed_by === userId ? (
                            <Button
                              disabled={pendingId === gift.id}
                              onClick={() => void releaseClaim(gift.id)}
                              size="sm"
                              variant="outline"
                            >
                              Undo claim
                            </Button>
                          ) : (
                            "Already taken"
                          )
                        ) : teamUp ? (
                          <NavLink
                            className="text-accent-red underline"
                            to="/team-ups"
                          >
                            {teamUp.status === "funded"
                              ? "Purchased"
                              : "Team-up in progress"}
                          </NavLink>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              disabled={pendingId === gift.id}
                              onClick={() => void claimGift(gift.id)}
                              size="sm"
                            >
                              I&apos;ll get this
                            </Button>
                            {gift.price !== null && gift.price >= 60 && (
                              <Button
                                disabled={pendingId === gift.id}
                                onClick={() => void createTeamUp(gift.id)}
                                size="sm"
                                variant="outline"
                              >
                                Team up
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {filtered.length === 0 && (
              <p className="p-5 text-sm text-muted-foreground">
                No items found in this list.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
