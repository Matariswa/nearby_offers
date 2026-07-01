"use client";

import { useEffect, useState, useMemo, useRef, DragEvent, ChangeEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { shopsService } from "@/services/shops.service";
import * as XLSX from "xlsx";
import { doc, collection, writeBatch, serverTimestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/firebase/firebase";
import Link from "next/link";
import type { Shop } from "@/types/shop";

const sidebarLinks = [
  { label: "Overview", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👤" },
  { label: "Shops", href: "/admin/shops", icon: "🏪" },
  { label: "Offers", href: "/admin/offers", icon: "🏷️" },
  { label: "Reviews", href: "/admin/reviews", icon: "⭐" },
  { label: "Import Shops", href: "/admin/import", icon: "📥" },
];

interface ParsedRow {
  rowNum: number;
  shopName: string;
  category: string;
  mainCategory: string;
  subcategory: string;
  address: string;
  phone: string;
  googleMapsLink: string;
  city: string;
  state: string;
  pincode: string;
  description: string;
  openingTime: string;
  closingTime: string;
  latitude: number;
  longitude: number;
  errors: string[];
  isDuplicateFile: boolean;
  isDuplicateDb: boolean;
  existingShopId?: string;
  existingVerified?: boolean;
}

interface ImportStats {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
}

export default function AdminImportShopsPage() {
  const { firebaseUser, userProfile } = useAuth();
  const [existingShops, setExistingShops] = useState<Shop[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Upload States
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsingFile, setParsingFile] = useState(false);

  // Settings
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");
  const [autoVerify, setAutoVerify] = useState(false);

  // Execution States
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);

  // Preview Paginated/Filtered States
  const [previewPage, setPreviewPage] = useState(1);
  const [previewSearch, setPreviewSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing shops to use for duplicate detection in-memory
  const loadExistingShops = async () => {
    try {
      setLoadingExisting(true);
      const shops = await shopsService.getAllShops();
      setExistingShops(shops);
    } catch (err) {
      console.error("Failed to load existing shops:", err);
      setErrorMsg("Failed to load existing shops from Firestore. Duplicate detection might be affected.");
    } finally {
      setLoadingExisting(false);
    }
  };

  useEffect(() => {
    loadExistingShops();
  }, []);

  // Category mapping utility
  const mapCategory = (categoryInput: string): { mainCategory: string; subcategory: string } => {
    const norm = categoryInput.toLowerCase().trim();

    // Food & Dining
    if (
      norm.includes("dining") || norm.includes("food") || norm.includes("restaurant") ||
      norm.includes("cafe") || norm.includes("café") || norm.includes("bakery") ||
      norm.includes("pizza") || norm.includes("burger") || norm.includes("sushi") ||
      norm.includes("coffee") || norm.includes("tea") || norm.includes("bar") ||
      norm.includes("pub") || norm.includes("ice cream") || norm.includes("bistro") ||
      norm.includes("eats") || norm.includes("caterer") || norm.includes("sweet")
    ) {
      return { mainCategory: "Food & Dining", subcategory: categoryInput };
    }

    // Health & Services
    if (
      norm.includes("health") || norm.includes("pharmacy") || norm.includes("service") ||
      norm.includes("clinic") || norm.includes("dentist") || norm.includes("doctor") ||
      norm.includes("hospital") || norm.includes("salon") || norm.includes("spa") ||
      norm.includes("barber") || norm.includes("beauty") || norm.includes("massage") ||
      norm.includes("gym") || norm.includes("fitness") || norm.includes("laundry") ||
      norm.includes("dry clean") || norm.includes("tailor") || norm.includes("bank") ||
      norm.includes("atm") || norm.includes("repair") || norm.includes("consultant") ||
      norm.includes("courier") || norm.includes("lawyer") || norm.includes("mechanic") ||
      norm.includes("optical") || norm.includes("optician")
    ) {
      return { mainCategory: "Health & Services", subcategory: categoryInput };
    }

    // Entertainment & Lifestyle
    if (
      norm.includes("entertainment") || norm.includes("lifestyle") || norm.includes("theater") ||
      norm.includes("cinema") || norm.includes("museum") || norm.includes("gallery") ||
      norm.includes("park") || norm.includes("club") || norm.includes("lounge") ||
      norm.includes("bowling") || norm.includes("arcade") || norm.includes("karaoke") ||
      norm.includes("event") || norm.includes("sports") || norm.includes("concert") ||
      norm.includes("stadium") || norm.includes("golf") || norm.includes("play") ||
      norm.includes("amusement") || norm.includes("discotheque")
    ) {
      return { mainCategory: "Entertainment & Lifestyle", subcategory: categoryInput };
    }

    // Shopping (Default section check)
    if (
      norm.includes("shopping") || norm.includes("shop") || norm.includes("store") ||
      norm.includes("grocery") || norm.includes("groceries") || norm.includes("supermarket") ||
      norm.includes("mall") || norm.includes("fashion") || norm.includes("apparel") ||
      norm.includes("clothing") || norm.includes("wear") || norm.includes("electronics") ||
      norm.includes("mobile") || norm.includes("phone") || norm.includes("shoes") ||
      norm.includes("jewelry") || norm.includes("book") || norm.includes("toy") ||
      norm.includes("gift") || norm.includes("retail") || norm.includes("boutique") ||
      norm.includes("market") || norm.includes("florist") || norm.includes("hardware") ||
      norm.includes("furniture") || norm.includes("appliance") || norm.includes("stationery")
    ) {
      return { mainCategory: "Shopping", subcategory: categoryInput };
    }

    // Fallback if undetermined
    return { mainCategory: "Shopping", subcategory: categoryInput };
  };

  // Coordinates parsing from Google Maps links
  const parseCoordinatesFromMapLink = (link: string): { latitude: number; longitude: number } | null => {
    if (!link) return null;
    
    // Pattern: @latitude,longitude (e.g. @12.9715987,77.5945627)
    const matchAt = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchAt) {
      return {
        latitude: parseFloat(matchAt[1]),
        longitude: parseFloat(matchAt[2]),
      };
    }
    // Pattern: q=latitude,longitude
    const matchQ = link.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchQ) {
      return {
        latitude: parseFloat(matchQ[1]),
        longitude: parseFloat(matchQ[2]),
      };
    }
    // Pattern: daddr=latitude,longitude
    const matchDaddr = link.match(/[?&]daddr=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchDaddr) {
      return {
        latitude: parseFloat(matchDaddr[1]),
        longitude: parseFloat(matchDaddr[2]),
      };
    }
    return null;
  };

  // File drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);
    setImportStats(null);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndParseFile(droppedFile);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setImportStats(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndParseFile(selectedFile);
    }
  };

  const validateAndParseFile = (uploadingFile: File) => {
    const extension = uploadingFile.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx") {
      setErrorMsg("Invalid file format. Please upload only .csv or .xlsx files.");
      return;
    }
    setFile(uploadingFile);
    parseFile(uploadingFile);
  };

  // Main Parsing Logic
  const parseFile = (targetFile: File) => {
    setParsingFile(true);
    setParsedRows([]);
    setPreviewPage(1);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Could not read file data.");

        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (rows.length <= 1) {
          setErrorMsg("The uploaded file is empty or contains no data rows.");
          setParsingFile(false);
          return;
        }

        const headers = (rows[0] || []) as string[];
        const mapping = {
          shopName: -1,
          category: -1,
          address: -1,
          phone: -1,
          googleMapsLink: -1,
          city: -1,
          state: -1,
          pincode: -1,
          description: -1,
          openingTime: -1,
          closingTime: -1,
          latitude: -1,
          longitude: -1,
        };

        headers.forEach((h, idx) => {
          if (!h) return;
          const clean = h.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, "");
          if (["shopname", "name", "title", "storename"].includes(clean)) mapping.shopName = idx;
          else if (["category", "type", "genre", "categories"].includes(clean)) mapping.category = idx;
          else if (["address", "location", "addr", "street"].includes(clean)) mapping.address = idx;
          else if (["phone", "phonenumber", "tel", "telephone", "contact"].includes(clean)) mapping.phone = idx;
          else if (["googlemapslink", "googlemaps", "mapslink", "maplink", "link"].includes(clean)) mapping.googleMapsLink = idx;
          else if (["city", "town"].includes(clean)) mapping.city = idx;
          else if (["state", "region"].includes(clean)) mapping.state = idx;
          else if (["pincode", "zip", "zipcode", "postalcode", "pin"].includes(clean)) mapping.pincode = idx;
          else if (["description", "desc", "about"].includes(clean)) mapping.description = idx;
          else if (["openingtime", "opentime", "opens"].includes(clean)) mapping.openingTime = idx;
          else if (["closingtime", "closetime", "closes"].includes(clean)) mapping.closingTime = idx;
          else if (["latitude", "lat"].includes(clean)) mapping.latitude = idx;
          else if (["longitude", "lng", "lon"].includes(clean)) mapping.longitude = idx;
        });

        // Ensure key fields are found
        const missingFields = [];
        if (mapping.shopName === -1) missingFields.push("Shop Name");
        if (mapping.category === -1) missingFields.push("Category");
        if (mapping.address === -1) missingFields.push("Address");
        if (mapping.phone === -1) missingFields.push("Phone");

        if (missingFields.length > 0) {
          setErrorMsg(`Could not map essential columns. Missing headers: ${missingFields.join(", ")}`);
          setParsingFile(false);
          return;
        }

        // Build existing database cache mapping for quick indexing
        const dbShopsMap = new Map<string, Shop>();
        existingShops.forEach((s) => {
          const key = `${s.shopName.toLowerCase().trim()}_${s.address.toLowerCase().trim()}`;
          dbShopsMap.set(key, s);
        });

        const fileSeenKeys = new Set<string>();
        const parsed: ParsedRow[] = [];

        // Validate each row
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue; // Empty row array

          // Check if row is physically empty (all items are null/empty string)
          const isPhysicallyEmpty = row.every((val) => val === undefined || val === null || val.toString().trim() === "");
          if (isPhysicallyEmpty) continue;

          const getVal = (colIdx: number) => {
            if (colIdx === -1 || row[colIdx] === undefined || row[colIdx] === null) return "";
            return row[colIdx].toString().trim();
          };

          const shopName = getVal(mapping.shopName);
          const categoryVal = getVal(mapping.category);
          const address = getVal(mapping.address);
          const phone = getVal(mapping.phone);
          const googleMapsLink = getVal(mapping.googleMapsLink);
          const city = getVal(mapping.city) || "Local";
          const state = getVal(mapping.state) || "Local";
          const pincode = getVal(mapping.pincode) || "000000";
          const description = getVal(mapping.description);
          const openingTime = getVal(mapping.openingTime) || "09:00 AM";
          const closingTime = getVal(mapping.closingTime) || "09:00 PM";
          const latitudeRaw = getVal(mapping.latitude);
          const longitudeRaw = getVal(mapping.longitude);

          const rowErrors: string[] = [];

          // Required Validation
          if (!shopName) rowErrors.push("Shop Name is required.");
          if (!categoryVal) rowErrors.push("Category is required.");
          if (!address) rowErrors.push("Address is required.");

          // Phone Validation (Optional)
          if (phone && !/^\+?[\d\s-()]{7,20}$/.test(phone)) {
            rowErrors.push("Invalid phone number format.");
          }

          // Pincode Validation
          if (pincode !== "000000" && !/^\d{5,6}$/.test(pincode)) {
            rowErrors.push("Pincode must be a 5 or 6 digit number.");
          }

          // Category mapping
          const { mainCategory, subcategory } = mapCategory(categoryVal);

          // Geo Parsing
          let lat = parseFloat(latitudeRaw);
          let lng = parseFloat(longitudeRaw);

          if (isNaN(lat) || isNaN(lng)) {
            const parsedCoords = parseCoordinatesFromMapLink(googleMapsLink);
            if (parsedCoords) {
              lat = parsedCoords.latitude;
              lng = parsedCoords.longitude;
            } else {
              lat = 0;
              lng = 0;
            }
          }

          // Duplicate Checks
          const key = `${shopName.toLowerCase().trim()}_${address.toLowerCase().trim()}`;
          
          // Check file duplicates
          let isDuplicateFile = false;
          if (fileSeenKeys.has(key)) {
            isDuplicateFile = true;
            rowErrors.push("Duplicate Shop Name + Address in this file.");
          } else {
            fileSeenKeys.add(key);
          }

          // Check DB duplicates
          const dbMatch = dbShopsMap.get(key);
          const isDuplicateDb = !!dbMatch;

          parsed.push({
            rowNum: i + 1,
            shopName,
            category: categoryVal,
            mainCategory,
            subcategory,
            address,
            phone,
            googleMapsLink,
            city,
            state,
            pincode,
            description,
            openingTime,
            closingTime,
            latitude: lat,
            longitude: lng,
            errors: rowErrors,
            isDuplicateFile,
            isDuplicateDb,
            existingShopId: dbMatch?.shopId,
            existingVerified: dbMatch?.verified,
          });
        }

        setParsedRows(parsed);
      } catch (err) {
        console.error("Error parsing spreadsheet file:", err);
        setErrorMsg("Failed to parse the file. Please make sure it is a valid CSV or Excel spreadsheet.");
      } finally {
        setParsingFile(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg("Failed to read the file.");
      setParsingFile(false);
    };

    reader.readAsArrayBuffer(targetFile);
  };

  // Triggers template download
  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.setAttribute("href", "/business_import_template.xlsx");
    link.setAttribute("download", "business_import_template.xlsx");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancel = () => {
    setFile(null);
    setParsedRows([]);
    setErrorMsg(null);
    setImportProgress(0);
    setImportStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Preview filtering & pagination calculations
  const filteredRows = useMemo(() => {
    return parsedRows.filter((r) => {
      const q = previewSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        r.shopName.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.phone.includes(q)
      );
    });
  }, [parsedRows, previewSearch]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (previewPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, previewPage]);

  // Statistics calculation for parsed data
  const parsedStats = useMemo(() => {
    const total = parsedRows.length;
    let valid = 0;
    let dbDuplicates = 0;
    let fileDuplicates = 0;
    let invalid = 0;

    parsedRows.forEach((r) => {
      if (r.errors.length > 0) {
        if (r.isDuplicateFile) {
          fileDuplicates++;
        } else {
          invalid++;
        }
      } else if (r.isDuplicateDb) {
        dbDuplicates++;
        valid++;
      } else {
        valid++;
      }
    });

    return { total, valid, dbDuplicates, fileDuplicates, invalid };
  }, [parsedRows]);

  // Import Action Executor
  const handleImport = async () => {
    if (parsedRows.length === 0 || importing) return;

    setImporting(true);
    setImportProgress(0);
    setImportStats(null);

    const ownerId = firebaseUser?.uid || "admin";
    const ownerName = userProfile?.name || firebaseUser?.displayName || "Admin";
    const email = firebaseUser?.email || userProfile?.email || "";
    const db = getFirebaseDb();

    // Filter out rows with fatal errors (but allow database duplicates since we handle them)
    const rowsToProcess = parsedRows.filter(r => {
      return r.errors.filter(err => err !== "Duplicate Shop Name + Address in this file").length === 0 && !r.isDuplicateFile;
    });

    const totalToProcess = rowsToProcess.length;
    if (totalToProcess === 0) {
      setErrorMsg("No valid rows to import.");
      setImporting(false);
      return;
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    const BATCH_SIZE = 100;

    try {
      for (let i = 0; i < totalToProcess; i += BATCH_SIZE) {
        const chunk = rowsToProcess.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);

        chunk.forEach((row) => {
          const shopData = {
            ownerId,
            ownerName,
            email,
            shopName: row.shopName,
            category: row.subcategory, // write subcategory as the general category field to avoid codebreaks
            mainCategory: row.mainCategory,
            subcategory: row.subcategory,
            description: row.description,
            phone: row.phone,
            address: row.address,
            city: row.city,
            state: row.state,
            pincode: row.pincode,
            openingTime: row.openingTime,
            closingTime: row.closingTime,
            latitude: row.latitude,
            longitude: row.longitude,
            googleMapsLink: row.googleMapsLink,
            logo: null,
            shopImages: [],
            rating: 0,
            reviewCount: 0,
          };

          if (row.isDuplicateDb && row.existingShopId) {
            if (duplicateMode === "update") {
              const shopRef = doc(db, "shops", row.existingShopId);
              // Update existing shop, keeping verified status unless autoVerify override is active
              batch.update(shopRef, {
                ...shopData,
                verified: autoVerify ? true : (row.existingVerified ?? false),
                updatedAt: serverTimestamp(),
              });
              updated++;
            } else {
              skipped++;
            }
          } else {
            const newShopRef = doc(collection(db, "shops"));
            batch.set(newShopRef, {
              ...shopData,
              shopId: newShopRef.id,
              verified: autoVerify,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            imported++;
          }
        });

        // Write batch
        await batch.commit();

        const progressPercent = Math.min(Math.round(((i + chunk.length) / totalToProcess) * 100), 100);
        setImportProgress(progressPercent);
      }

      // Record stats
      setImportStats({
        total: parsedRows.length,
        imported,
        updated,
        skipped: skipped + parsedStats.fileDuplicates, // count file duplicates as skipped
        failed,
      });

      // Refresh database cache
      await loadExistingShops();
    } catch (err) {
      console.error("Firestore batch import failed:", err);
      setErrorMsg("An error occurred during firestore batch write. Some rows may not have been imported.");
      setImportStats({
        total: parsedRows.length,
        imported,
        updated,
        skipped,
        failed: totalToProcess - (imported + updated + skipped),
      });
    } finally {
      setImporting(false);
    }
  };

  // Search filter reset page index
  useEffect(() => {
    setPreviewPage(1);
  }, [previewSearch]);

  const hasErrors = parsedRows.some((r) => r.errors.length > 0);
  const importableCount = parsedRows.filter(r => r.errors.length === 0 || (r.isDuplicateDb && r.errors.filter(e => e !== "Duplicate Shop Name + Address in this file").length === 0)).length;

  return (
    <DashboardLayout
      title="Shop Import Center"
      description="Upload CSV or Excel spreadsheets to bulk import, update, and manage your shops."
      sidebarTitle="Administration"
      links={sidebarLinks}
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <Card className="overflow-hidden border-slate-200">
          <div className="bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white">
            <h2 className="text-xl font-bold">Admin Import Dashboard</h2>
            <p className="text-brand-100 text-sm mt-1">
              Easily load hundreds of shops. Supported formats: .csv, .xlsx.
            </p>
          </div>
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-semibold text-slate-800 text-sm">Download Templates</h4>
              <p className="text-xs text-slate-500">
                Ensure your column headers match standard identifiers before uploading.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="border-brand-200 text-brand-700 hover:bg-brand-50"
            >
              📥 Download Excel Template
            </Button>
          </CardContent>
        </Card>

        {loadingExisting ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <LoadingSpinner className="h-8 w-8 text-brand-600 animate-spin" />
            <span className="text-sm text-slate-500 font-medium animate-pulse">
              Caching database shop records for duplicate checks...
            </span>
          </div>
        ) : (
          <>
            {/* Options Panel & Upload Area */}
            {parsedRows.length === 0 ? (
              <div className="grid gap-6 md:grid-cols-12">
                {/* Left Panel: Settings */}
                <div className="md:col-span-4 space-y-6">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle className="text-base font-bold text-slate-900">Import Config</CardTitle>
                      <CardDescription>Configure how records are processed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Duplicate Handler Toggle */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          If Shop Already Exists
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                          <button
                            type="button"
                            onClick={() => setDuplicateMode("skip")}
                            className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                              duplicateMode === "skip"
                                ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Skip It
                          </button>
                          <button
                            type="button"
                            onClick={() => setDuplicateMode("update")}
                            className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all ${
                              duplicateMode === "update"
                                ? "bg-white text-slate-800 shadow-sm border border-slate-100"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            Update It
                          </button>
                        </div>
                      </div>

                      {/* Auto Verify Toggle */}
                      <div className="flex items-center justify-between py-2 border-t border-slate-100">
                        <div className="space-y-0.5">
                          <label htmlFor="autoVerify" className="text-xs font-bold text-slate-700 cursor-pointer">
                            Auto-Verify Shops
                          </label>
                          <p className="text-[10px] text-slate-400">Mark imported shops as verified instantly.</p>
                        </div>
                        <input
                          id="autoVerify"
                          type="checkbox"
                          checked={autoVerify}
                          onChange={(e) => setAutoVerify(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel: Upload Zone */}
                <div className="md:col-span-8">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center h-full min-h-[250px] border-2 border-dashed rounded-xl cursor-pointer p-8 text-center transition-all ${
                      isDragging
                        ? "border-brand-500 bg-brand-50/50 scale-[1.01]"
                        : "border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50/30"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".csv, .xlsx"
                      className="hidden"
                    />

                    {parsingFile ? (
                      <div className="space-y-3">
                        <LoadingSpinner size="lg" className="mx-auto" />
                        <p className="text-sm font-semibold text-slate-600 animate-pulse">
                          Reading and validating spreadsheet data...
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="h-16 w-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-3xl animate-bounce">
                          📁
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-700">
                            Drag & drop your CSV or Excel file here
                          </p>
                          <p className="text-xs text-slate-400">
                            or click to browse local files (max 10MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Preview and Import Actions */
              <div className="space-y-6">
                {/* Validation Stats & Meta */}
                <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Rows</p>
                      <p className="text-xl font-bold text-slate-800 mt-1">{parsedStats.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-[10px] text-emerald-500 uppercase font-semibold">Ready to Import</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{parsedStats.valid}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-[10px] text-amber-500 uppercase font-semibold">Existing (DB)</p>
                      <p className="text-xl font-bold text-amber-600 mt-1">{parsedStats.dbDuplicates}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-[10px] text-rose-400 uppercase font-semibold">File Duplicates</p>
                      <p className="text-xl font-bold text-rose-500 mt-1">{parsedStats.fileDuplicates}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-[10px] text-red-500 uppercase font-semibold">Rows with Errors</p>
                      <p className="text-xl font-bold text-red-600 mt-1">{parsedStats.invalid}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Import Controls */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold">Loaded File: {file?.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Review validation results below before submitting. Action mode:{" "}
                        <span className="font-semibold text-brand-600 capitalize">{duplicateMode} duplicates</span>.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCancel} disabled={importing}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleImport}
                        disabled={importing || importableCount === 0}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-sm"
                      >
                        {importing ? "Importing..." : `Import ${importableCount} Shops`}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Execution Progress Overlay */}
                    {importing && (
                      <div className="p-6 bg-slate-50/80 border-b border-slate-100 space-y-3">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>Importing data chunks to Firestore...</span>
                          <span>{importProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${importProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Table Tools (Search) */}
                    <div className="p-4 flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
                      <input
                        type="text"
                        placeholder="Search parsed preview..."
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
                      />
                      <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                        Showing {filteredRows.length} of {parsedRows.length} records
                      </span>
                    </div>

                    {/* Preview Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                            <th className="p-4 w-12 text-center">Row</th>
                            <th className="p-4 min-w-[150px]">Shop Name</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">Phone</th>
                            <th className="p-4 min-w-[200px]">Address</th>
                            <th className="p-4 text-center">Map</th>
                            <th className="p-4 text-right">Status / Errors</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedRows.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                No records found matching filter.
                              </td>
                            </tr>
                          ) : (
                            paginatedRows.map((row) => {
                              const isDbDup = row.isDuplicateDb;
                              const isFileDup = row.isDuplicateFile;
                              const hasFatalErr = row.errors.filter(e => e !== "Duplicate Shop Name + Address in this file").length > 0;

                              let statusBadge = (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                  Valid
                                </span>
                              );

                              if (hasFatalErr) {
                                statusBadge = (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700">
                                    Error
                                  </span>
                                );
                              } else if (isFileDup) {
                                statusBadge = (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700">
                                    File Dup (Skip)
                                  </span>
                                );
                              } else if (isDbDup) {
                                statusBadge = duplicateMode === "skip" ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                                    DB Dup (Skip)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                    DB Dup (Update)
                                  </span>
                                );
                              }

                              return (
                                <tr key={row.rowNum} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4 text-center font-semibold text-slate-400">{row.rowNum}</td>
                                  <td className="p-4 font-bold text-slate-900">{row.shopName}</td>
                                  <td className="p-4">
                                    <div className="space-y-0.5">
                                      <span className="font-semibold text-slate-700">{row.category}</span>
                                      <div className="text-[10px] text-slate-400">
                                        Mapped: <span className="font-medium text-slate-500">{row.mainCategory}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-4 font-medium text-slate-600">{row.phone}</td>
                                  <td className="p-4 text-slate-500">
                                    {row.address}
                                    {row.city && <span className="text-[10px] text-slate-400 block">{row.city}, {row.state} {row.pincode}</span>}
                                  </td>
                                  <td className="p-4 text-center">
                                    {row.googleMapsLink ? (
                                      <a
                                        href={row.googleMapsLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-lg hover:opacity-85 transition-opacity"
                                        title={row.googleMapsLink}
                                      >
                                        📍
                                      </a>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="space-y-1">
                                      {statusBadge}
                                      {row.errors.map((err, idx) => (
                                        <div key={idx} className="text-[10px] font-medium text-red-500 leading-tight">
                                          ⚠️ {err}
                                        </div>
                                      ))}
                                      {row.latitude !== 0 && row.longitude !== 0 && (
                                        <div className="text-[9px] text-slate-400">
                                          Coordinates: {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="p-4 flex items-center justify-between border-t border-slate-100">
                        <button
                          type="button"
                          disabled={previewPage === 1}
                          onClick={() => setPreviewPage((prev) => Math.max(prev - 1, 1))}
                          className="px-3 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-xs text-slate-500">
                          Page {previewPage} of {totalPages}
                        </span>
                        <button
                          type="button"
                          disabled={previewPage === totalPages}
                          onClick={() => setPreviewPage((prev) => Math.min(prev + 1, totalPages))}
                          className="px-3 py-1 text-xs border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-start gap-2.5 shadow-sm">
                <span className="text-sm">⚠️</span>
                <div>
                  <h5 className="font-bold text-red-800">Error Occurred</h5>
                  <p className="mt-0.5">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Completion Summary Card */}
            {importStats && (
              <Card className="border-slate-200 overflow-hidden shadow-md">
                <div className="bg-emerald-600 p-5 text-white">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span>✨</span> Bulk Import Completed
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    The spreadsheet items have been successfully cataloged in Firestore.
                  </p>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Total Checked</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">{importStats.total}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center animate-pulse">
                      <p className="text-[10px] text-emerald-500 font-bold uppercase">Imported (New)</p>
                      <p className="text-2xl font-black text-emerald-700 mt-1">+{importStats.imported}</p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-center">
                      <p className="text-[10px] text-blue-500 font-bold uppercase">Updated</p>
                      <p className="text-2xl font-black text-blue-700 mt-1">+{importStats.updated}</p>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                      <p className="text-[10px] text-amber-500 font-bold uppercase">Skipped</p>
                      <p className="text-2xl font-black text-amber-700 mt-1">{importStats.skipped}</p>
                    </div>
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center">
                      <p className="text-[10px] text-rose-500 font-bold uppercase">Failed</p>
                      <p className="text-2xl font-black text-rose-700 mt-1">{importStats.failed}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      Import Another File
                    </Button>
                    <Link href="/admin/shops">
                      <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold">
                        View Shops Directory 🏪
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
