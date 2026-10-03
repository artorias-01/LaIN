import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/authStore'
import type { UserProfile } from '@/types'

export const useAuth = () => {
  const { user, isLoading, setUser, setLoading, clearUser } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          profile,
        })
      } else {
        clearUser()
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setUser({
            id: session.user.id,
            email: session.user.email ?? '',
            profile,
          })
        } else {
          clearUser()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error || !data) return null
    return data as UserProfile
  }

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })
    if (error) throw error

    // Create profile row
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        username,
        avatar_url: null,
        bio: null,
      })
    }

    return data
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    // Clear listener status on logout
    if (user) {
      await supabase
        .from('listener_status')
        .update({ is_sharing: false })
        .eq('user_id', user.id)
    }
    await supabase.auth.signOut()
    clearUser()
  }

  return { user, isLoading, signUp, signIn, signOut }
}
