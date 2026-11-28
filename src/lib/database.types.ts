type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type TreeTheme =
  "classic" | "tokyo-night" | "mist" | "amber" | "cyberpunk"
export type AppTheme = "family" | TreeTheme
export type AvatarIcon =
  | "gift"
  | "bell"
  | "candy-cane"
  | "snowflake"
  | "cookie"
  | "gem"
  | "rocket"
  | "puzzle"
  | "candy"
  | "heart"
  | "star"

export type GiftCategory = "want" | "need" | "gift_card" | "nice_to_have"

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string
          display_name: string
          avatar_color: string
          avatar_icon: AvatarIcon
          avatar_photo: string | null
          favorite_items: string[]
          things_they_like: string[]
          created_at: string
        },
        {
          id: string
          display_name: string
          avatar_color?: string
          avatar_icon?: AvatarIcon
          avatar_photo?: string | null
          favorite_items?: string[]
          things_they_like?: string[]
          created_at?: string
        },
        {
          id?: string
          display_name?: string
          avatar_color?: string
          avatar_icon?: AvatarIcon
          avatar_photo?: string | null
          favorite_items?: string[]
          things_they_like?: string[]
          created_at?: string
        }
      >
      profile_private: Table<
        {
          user_id: string
          birth_year: number | null
          share_age: boolean
          app_theme: AppTheme
        },
        {
          user_id: string
          birth_year?: number | null
          share_age?: boolean
          app_theme?: AppTheme
        },
        {
          user_id?: string
          birth_year?: number | null
          share_age?: boolean
          app_theme?: AppTheme
        }
      >
      families: Table<
        {
          id: string
          name: string
          year: number
          tree_theme: TreeTheme
          custom_tree_theme_id: string | null
          custom_tree_hue: number | null
          custom_tree_accent_hue: number | null
          created_by: string
          created_at: string
        },
        {
          id?: string
          name: string
          year: number
          tree_theme?: TreeTheme
          custom_tree_theme_id?: string | null
          custom_tree_hue?: number | null
          custom_tree_accent_hue?: number | null
          created_by: string
          created_at?: string
        }
      >
      family_tree_custom_themes: Table<
        {
          id: string
          family_id: string
          name: string
          hue: number
          accent_hue: number
          created_at: string
        },
        {
          id?: string
          family_id: string
          name: string
          hue: number
          accent_hue: number
          created_at?: string
        }
      >
      family_invite_secrets: Table<
        {
          family_id: string
          invite_code: string
          invite_code_expires_at: string
        },
        {
          family_id: string
          invite_code: string
          invite_code_expires_at: string
        }
      >
      family_members: Table<
        {
          family_id: string
          user_id: string
          role: "owner" | "member"
          joined_at: string
        },
        {
          family_id: string
          user_id: string
          role?: "owner" | "member"
          joined_at?: string
        }
      >
      family_invites: Table<
        {
          id: string
          family_id: string
          display_name: string
          invited_by: string
          joined_user_id: string | null
          status: "pending" | "joined"
          created_at: string
        },
        {
          id?: string
          family_id: string
          display_name: string
          invited_by: string
          joined_user_id?: string | null
          status?: "pending" | "joined"
          created_at?: string
        }
      >
      family_invite_contacts: Table<
        { invite_id: string; family_id: string; email: string },
        { invite_id: string; family_id: string; email: string }
      >
      family_children: Table<
        {
          id: string
          family_id: string
          parent_id: string
          display_name: string
          created_at: string
        },
        {
          id?: string
          family_id: string
          parent_id: string
          display_name: string
          created_at?: string
        }
      >
      wish_lists: Table<
        {
          id: string
          family_id: string
          owner_id: string
          child_id: string | null
          name: string
          created_at: string
        },
        {
          id?: string
          family_id: string
          owner_id: string
          child_id?: string | null
          name: string
          created_at?: string
        }
      >
      gifts: Table<
        {
          id: string
          list_id: string
          family_id: string
          owner_id: string
          title: string
          url: string | null
          store: string | null
          price: number | null
          category: GiftCategory
          image_url: string | null
          notes: string | null
          created_at: string
        },
        {
          id?: string
          list_id: string
          family_id: string
          owner_id: string
          title: string
          url?: string | null
          store?: string | null
          price?: number | null
          category?: GiftCategory
          image_url?: string | null
          notes?: string | null
          created_at?: string
        }
      >
      claims: Table<
        {
          gift_id: string
          family_id: string
          claimed_by: string
          claimed_at: string
          purchased_at: string | null
          purchase_proof_url: string | null
        },
        {
          gift_id: string
          family_id: string
          claimed_by: string
          claimed_at?: string
          purchased_at?: string | null
          purchase_proof_url?: string | null
        }
      >
      team_ups: Table<
        {
          id: string
          family_id: string
          gift_id: string
          created_by: string
          status: "open" | "funded"
          purchase_proof_url: string | null
          created_at: string
          funded_at: string | null
        },
        {
          id?: string
          family_id: string
          gift_id: string
          created_by: string
          status?: "open" | "funded"
          purchase_proof_url?: string | null
          created_at?: string
          funded_at?: string | null
        }
      >
      team_up_members: Table<
        {
          team_up_id: string
          user_id: string
          pledge: number | null
          joined_at: string
          confirmed_at: string | null
        },
        {
          team_up_id: string
          user_id: string
          pledge?: number | null
          joined_at?: string
          confirmed_at?: string | null
        }
      >
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_profile: { Args: { p_profile_id: string }; Returns: boolean }
      claim_gift: { Args: { p_gift_id: string }; Returns: undefined }
      complete_team_up: {
        Args: { p_team_up_id: string; p_purchase_proof_url: string }
        Returns: undefined
      }
      confirm_gift_purchase: {
        Args: { p_gift_id: string; p_purchase_proof_url: string }
        Returns: undefined
      }
      create_family: {
        Args: { p_name: string; p_year: number }
        Returns: {
          family_id: string
          name: string
          year: number
          invite_code: string
          invite_code_expires_at: string
        }[]
      }
      create_family_invite: {
        Args: { p_family_id: string; p_display_name: string; p_email: string }
        Returns: { invite_id: string; display_name: string }[]
      }
      create_team_up: { Args: { p_gift_id: string }; Returns: string }
      delete_empty_family: { Args: { p_family_id: string }; Returns: undefined }
      get_family_member_ages: {
        Args: { p_family_id: string }
        Returns: { user_id: string; age_label: string | null }[]
      }
      is_family_member: { Args: { p_family_id: string }; Returns: boolean }
      is_family_owner: { Args: { p_family_id: string }; Returns: boolean }
      confirm_team_up: { Args: { p_team_up_id: string }; Returns: undefined }
      invite_to_team_up: {
        Args: { p_team_up_id: string; p_user_id: string }
        Returns: undefined
      }
      is_team_up_invitee: {
        Args: { p_team_up_id: string }
        Returns: boolean
      }
      is_team_up_participant: {
        Args: { p_team_up_id: string }
        Returns: boolean
      }
      join_family: {
        Args: { p_invite_code: string }
        Returns: {
          family_id: string
          name: string
          year: number
          invite_code: string
          invite_code_expires_at: string
        }[]
      }
      release_gift_claim: { Args: { p_gift_id: string }; Returns: undefined }
      regenerate_family_invite: {
        Args: { p_family_id: string }
        Returns: string
      }
      set_family_invite_expiry: {
        Args: { p_family_id: string; p_expires_on: string }
        Returns: string
      }
    }
    Enums: {
      gift_category: GiftCategory
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
