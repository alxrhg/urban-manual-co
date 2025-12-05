/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { Metadata } from 'next'

import { generatePageMetadata, NotFoundPage } from '@payloadcms/next/views'

import configPromise from '../../../../payload.config'
import { importMap } from '../importMap'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config: configPromise, params, searchParams })

const NotFound = ({ params, searchParams }: Args) =>
  NotFoundPage({ config: configPromise, importMap, params, searchParams })

export default NotFound
