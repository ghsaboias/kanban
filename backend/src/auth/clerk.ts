import type { Request, Response, NextFunction } from 'express'
import { clerkMiddleware, requireAuth, clerkClient, getAuth } from '@clerk/express'
import { prisma } from '../database'

export const withAuth = clerkMiddleware()
export const requireAuthMw = requireAuth()

// Debug middleware for development - can be enabled when needed
export const debugAuthMw = (req: Request, res: Response, next: NextFunction) => {
  
  const auth = getAuth(req)
  
  next()
}

type AuthedRequest = Request

export async function ensureUser(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req)
    const userId = auth?.userId
    if (!userId) return next()

    // Try to find or create local user by Clerk ID (race-safe)
    const remote = await clerkClient.users.getUser(userId)
    const email = remote?.primaryEmailAddress?.emailAddress || remote?.emailAddresses?.[0]?.emailAddress
    const name = [remote.firstName, remote.lastName].filter(Boolean).join(' ').trim() || remote.username || email || 'User'

    const local = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        // Keep name/email fresh if they exist remotely
        ...(email ? { email } : {}),
        ...(name ? { name } : {}),
      },
      create: {
        clerkId: userId,
        email: email || `${userId}@example.local`,
        name,
      },
    })

    res.locals.user = local
    return next()
  } catch (err) {
    return next(err)
  }
}
