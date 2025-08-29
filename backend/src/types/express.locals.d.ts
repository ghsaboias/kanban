import 'express-serve-static-core'

declare module 'express-serve-static-core' {
  interface ResponseLocals {
    user?: {
      id: string
      email: string
      name: string
      clerkId: string | null
    }
  }
}

