import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import config from "../../plasmic.json";

export const PLASMIC = config.projects.length > 0
  ? initPlasmicLoader({
      projects: config.projects.map((p: any) => ({
        id: p.projectId,
        token: p.projectApiToken,
      })),
      preview: true,
    })
  : null;

