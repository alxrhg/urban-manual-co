/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

import * as React from "react";
import { DefaultHomepageProps } from "./PlasmicHomepage"; // plasmic-import: 00qJ1fKtVG-9/render

import { ClientHomepage } from "../../../app/page-client"; // plasmic-import: 00qJ1fKtVG-9/rscClient

const $$ = {};

import {
  executeServerQuery,
  mkPlasmicUndefinedServerProxy,
  ServerQuery
} from "@plasmicapp/react-web/lib/data-sources";

export async function executeServerQueries($ctx: any) {
  const $queries: Record<string, any> = {};

  const serverQueries: Record<
    string,
    ServerQuery<(typeof $$)[keyof typeof $$]>
  > = {};

  do {
    await Promise.all(
      Object.keys(serverQueries).map(async key => {
        $queries[key] = await executeServerQuery(serverQueries[key]);
        if (!$queries[key].data?.isUndefinedServerProxy) {
          delete serverQueries[key];
        }
      })
    );
  } while (
    Object.values($queries).some(value => value.data?.isUndefinedServerProxy)
  );

  return $queries;
}

function mkPathFromRouteAndParams(
  route: string,
  params: Record<string, string | string[] | undefined>
) {
  if (!params) {
    return route;
  }
  let path = route;
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      path = path.replace(`[${key}]`, value);
    } else if (Array.isArray(value)) {
      if (path.includes(`[[...${key}]]`)) {
        path = path.replace(`[[...${key}]]`, value.join("/"));
      } else if (path.includes(`[...${key}]`)) {
        path = path.replace(`[...${key}]`, value.join("/"));
      }
    }
  }
  return path;
}

type PlasmicHomepageServerProps = DefaultHomepageProps & {
  params?: Promise<Record<string, string | string[] | undefined>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function PlasmicHomepageServer(props: PlasmicHomepageServerProps) {
  const { params, searchParams, ...rest } = props;

  const pageRoute = "/";
  const pageParams = (await params) ?? {};
  const pagePath = mkPathFromRouteAndParams(pageRoute, pageParams);

  const $ctx = {
    pageRoute,
    pagePath,
    params: pageParams,
    query: searchParams
  };

  const $serverQueries = await executeServerQueries($ctx);

  return <ClientHomepage {...rest} $serverQueries={$serverQueries} />;
}
