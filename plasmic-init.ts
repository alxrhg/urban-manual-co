import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "pEZdPb88zvW8NfciQQQwSK",  // ID of a project you are using
      token: "d0fi6cV4MQLTEGvTe2TT26wCj3TkMNfHBbzKMX46q6x2K81LIZYovDQq0rXPWN84FumgZihUdAqKoPztmgWKRQ"  // API token for that project
    }
  ],
  // Fetches the latest revisions, whether or not they were unpublished!
  // Disable for production to ensure you render only published changes.
  preview: true,
});

