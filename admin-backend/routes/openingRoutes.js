import express from "express";
import { createOpening, deleteOpening, getOpenings, updateOpening } from "../controllers/openingController.js";

const router = express.Router();

router.get("/", getOpenings);
router.post("/", createOpening);
router.put("/:id", updateOpening);
router.delete("/:id", deleteOpening);

export default router;
