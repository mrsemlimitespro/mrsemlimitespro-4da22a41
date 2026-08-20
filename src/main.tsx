import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-router-server";
import { getRouter } from "./router";

const router = getRouter();

hydrateRoot(document.getElementById("root")!, <StartClient router={router} />);

