import { clerkClient, clerkMiddleware, getAuth, requireAuth } from '@clerk/express'
import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../database'

export const withAuth = clerkMiddleware()
export const requireAuthMw = requireAuth()

// Debug middleware for development - can be enabled when needed
export const debugAuthMw = (req: Request, res: Response, next: NextFunction) => {

  const _auth = getAuth(req)

  next()
}

type AuthedRequest = Request

export async function ensureUser(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req)
    const userId = auth?.userId
    if (!userId) return next()

    // 1) Fast path: if local user already exists, avoid calling Clerk (prevents rate limits)
    const existing = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (existing) {
      res.locals.user = existing
      return next()
    }

    // 2) Fetch from Clerk only when needed (first seen user)
    let email: string | undefined
    let name: string | undefined
    try {
      const remote = await clerkClient.users.getUser(userId)
      email = remote?.primaryEmailAddress?.emailAddress || remote?.emailAddresses?.[0]?.emailAddress
      name = [remote.firstName, remote.lastName].filter(Boolean).join(' ').trim() || remote.username || email || 'User'
    } catch (e: unknown) {
      // Handle Clerk rate limits or network errors gracefully
      const error = e as { message?: unknown; status?: unknown; code?: unknown }
      const msg = typeof error?.message === 'string' ? error.message : ''
      const status = error?.status || error?.code
      if (status === 429 || /Too\s*Many\s*Requests/i.test(msg)) {
        // Fallback: proceed with a placeholder identity; we still persist a local user
        email = `${userId}@example.local`
        name = 'User'
      } else {
        // Unknown error; still fallback to creating a placeholder to unblock the request
        email = `${userId}@example.local`
        name = 'User'
      }
    }

    const local = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        ...(email ? { email } : {}),
        ...(name ? { name } : {}),
      },
      create: {
        clerkId: userId,
        email: email || `${userId}@example.local`,
        name: name || 'User',
      },
    })

    res.locals.user = local
    return next()
  } catch (err) {
    return next(err)
  }
}
