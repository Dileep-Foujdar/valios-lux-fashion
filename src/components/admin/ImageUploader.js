"use client";

import React, { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IoCloudUploadOutline, IoCloseOutline, IoSwapHorizontalOutline } from "react-icons/io5";
import toast from "react-hot-toast";
import api from "../../utils/api.js";

const SortableThumb = ({ url, index, onRemove, onReplace, uploading }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: url
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="rounded bg-white/15 px-2 py-1 text-[10px] font-bold uppercase text-white"
        >
          Drag
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={uploading}
            onClick={() => onReplace(index)}
            className="rounded bg-white/15 p-1 text-white"
            title="Replace"
          >
            <IoSwapHorizontalOutline />
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => onRemove(index)}
            className="rounded bg-red-500/80 p-1 text-white"
            title="Delete"
          >
            <IoCloseOutline />
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Direct-to-S3 image gallery uploader with progress, preview, delete, replace, reorder.
 */
const ImageUploader = ({
  value = [],
  onChange,
  folder = "products",
  minImages = 3,
  maxImages,
  label = "Product Images"
}) => {
  const inputRef = useRef(null);
  const replaceIndexRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState([]); // { id, name, progress, error }
  const [busy, setBusy] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const uploadFile = (file) =>
    new Promise(async (resolve, reject) => {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      setUploads((prev) => [...prev, { id, name: file.name, progress: 0 }]);

      const markError = (err) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  id: u.id,
                  name: u.name,
                  progress: 100,
                  error: err.response?.data?.message || err.message || "Failed"
                }
              : u
          )
        );
      };

      const setProgress = (progress) => {
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, progress } : u)));
      };

      const fileToDataUrl = () =>
        new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.onerror = () => rej(new Error("Could not read file"));
          reader.readAsDataURL(file);
        });

      try {
        setProgress(20);
        const dataUrl = await fileToDataUrl();
        setProgress(50);
        const res = await api.post("/uploads/s3", {
          fileName: file.name,
          contentType: file.type || "image/jpeg",
          folder,
          dataUrl
        });
        setProgress(100);
        setUploads((prev) => prev.filter((u) => u.id !== id));
        resolve(res.data.publicUrl);
      } catch (err) {
        markError(err);
        reject(err);
      }
    });

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) {
      toast.error("Please select image files");
      return;
    }

    setBusy(true);
    try {
      if (replaceIndexRef.current != null) {
        const idx = replaceIndexRef.current;
        replaceIndexRef.current = null;
        const url = await uploadFile(files[0]);
        const next = [...value];
        const old = next[idx];
        next[idx] = url;
        onChange(next);
        if (old) {
          api.delete("/uploads", { data: { url: old } }).catch(() => {});
        }
        toast.success("Image replaced");
      } else {
        const remaining =
          typeof maxImages === "number"
            ? Math.max(0, maxImages - (value?.length || 0))
            : files.length;
        if (remaining <= 0) {
          toast.error(`Maximum ${maxImages} image(s) allowed`);
          return;
        }
        const toUpload = files.slice(0, remaining);
        const urls = [];
        for (const file of toUpload) {
          // sequential to keep progress readable
          urls.push(await uploadFile(file));
        }
        onChange([...(value || []), ...urls]);
        toast.success(`${urls.length} image(s) uploaded`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemove = async (index) => {
    const url = value[index];
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    if (url) {
      try {
        await api.delete("/uploads", { data: { url } });
      } catch {
        // keep UI updated even if remote delete fails
      }
    }
  };

  const onReplace = (index) => {
    replaceIndexRef.current = index;
    inputRef.current?.click();
  };

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = value.indexOf(active.id);
    const newIndex = value.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
            {label}
          </h4>
          <p className="mt-0.5 text-[11px] font-medium text-zinc-500">
            {typeof maxImages === "number"
              ? `Up to ${maxImages} image${maxImages === 1 ? "" : "s"}`
              : `Min ${minImages} images`}{" "}
            · drag to reorder · uploads to AWS S3
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
            value.length >= minImages
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          }`}
        >
          {typeof maxImages === "number"
            ? `${value.length} / ${maxImages}`
            : `${value.length} / ${minImages}+`}
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (typeof maxImages === "number" && value.length >= maxImages && replaceIndexRef.current == null) {
            return;
          }
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          if (typeof maxImages === "number" && value.length >= maxImages) {
            replaceIndexRef.current = 0;
          } else {
            replaceIndexRef.current = null;
          }
          inputRef.current?.click();
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 transition-colors ${
          dragOver
            ? "border-black bg-zinc-50 dark:border-white dark:bg-zinc-900"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40"
        }`}
      >
        <IoCloudUploadOutline className="text-3xl text-zinc-400" />
        <p className="mt-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
          {typeof maxImages === "number" && value.length >= maxImages
            ? "Click to replace image"
            : "Drag & drop images here"}
        </p>
        <p className="mt-1 text-[11px] text-zinc-400">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={maxImages !== 1}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((u) => (
            <div key={u.id} className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-900">
              <div className="mb-1 flex justify-between text-[11px] font-semibold">
                <span className="truncate pr-3">{u.name}</span>
                <span>{u.error || `${u.progress}%`}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full ${u.error ? "bg-red-500" : "bg-zinc-900 dark:bg-white"}`}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={value} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {value.map((url, index) => (
                <SortableThumb
                  key={url}
                  url={url}
                  index={index}
                  uploading={busy}
                  onRemove={onRemove}
                  onReplace={onReplace}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default ImageUploader;
