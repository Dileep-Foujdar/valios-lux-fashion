import mongoose from "mongoose";

const HistorySchema = new mongoose.Schema({
  previousStatus: { type: String },
  newStatus: { type: String, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  partner: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner" },
  note: { type: String, default: "" },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const RejectionSchema = new mongoose.Schema({
  partner: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner", required: true },
  reason: { type: String, default: "" },
  at: { type: Date, default: Date.now }
}, { _id: false });

const DeliveryAssignmentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
  deliveryFee: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: [
      "available",
      "accepted",
      "picked_up",
      "out_for_delivery",
      "delivered",
      "rejected",
      "cancelled",
      "failed",
      "expired"
    ],
    default: "available",
    index: true
  },
  offeredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner" }],
  acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryPartner", default: null },
  rejectedBy: [RejectionSchema],
  areaLabel: { type: String, default: "" },
  instructions: { type: String, default: "" },
  expiresAt: { type: Date },
  assignedAt: { type: Date },
  acceptedAt: { type: Date },
  pickedUpAt: { type: Date },
  outForDeliveryAt: { type: Date },
  deliveredAt: { type: Date },
  history: [HistorySchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

DeliveryAssignmentSchema.index({ status: 1, expiresAt: 1 });
DeliveryAssignmentSchema.index({ acceptedBy: 1, status: 1 });

export default mongoose.models.DeliveryAssignment || mongoose.model("DeliveryAssignment", DeliveryAssignmentSchema);
