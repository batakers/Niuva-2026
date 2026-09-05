"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AuLink } from "@/components/ui/AuLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function CorePrimitiveShowcase() {
  return (
    <div className="grid gap-4 md:grid-cols-2" data-core-primitive-showcase>
      <Card>
        <CardHeader>
          <CardTitle><h3>Dialog</h3></CardTitle>
          <CardDescription>Meminta konfirmasi tanpa kehilangan konteks halaman.</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger render={<Button type="button" variant="outline" />}>
              Buka dialog
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Konfirmasi langkah berikutnya</DialogTitle>
                <DialogDescription>
                  Dialog membawa keputusan penting ke permukaan sebelum operator melanjutkan.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Batal
                </DialogClose>
                <Button type="button">Konfirmasi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h3>Dropdown menu</h3></CardTitle>
          <CardDescription>Aksi sekunder tetap terkelompok dan dapat ditemukan.</CardDescription>
        </CardHeader>
        <CardContent>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
              Aksi brief
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Project brief</DropdownMenuLabel>
                <DropdownMenuItem>Salin referensi</DropdownMenuItem>
                <DropdownMenuItem>Buka detail</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">Tandai perlu perhatian</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h3>Radio group</h3></CardTitle>
          <CardDescription>Satu pilihan material untuk fixture retail.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup aria-label="Material" defaultValue="pla">
            <label className="flex items-center gap-2 text-sm" htmlFor="core-material-pla">
              <RadioGroupItem id="core-material-pla" value="pla" />
              PLA
            </label>
            <label className="flex items-center gap-2 text-sm" htmlFor="core-material-abs">
              <RadioGroupItem id="core-material-abs" value="abs" />
              ABS
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h3>Select</h3></CardTitle>
          <CardDescription>Status dipilih dari nilai yang sudah tersedia.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            defaultValue="review"
            items={{
              review: "Siap ditinjau",
              progress: "Sedang dikerjakan",
              blocked: "Terblokir",
            }}
          >
            <SelectTrigger aria-label="Status project" className="w-full">
              <SelectValue placeholder="Pilih status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="review">Siap ditinjau</SelectItem>
              <SelectItem value="progress">Sedang dikerjakan</SelectItem>
              <SelectItem value="blocked">Terblokir</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h3>Switch</h3></CardTitle>
          <CardDescription>Preferensi opsional dengan label yang jelas.</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-3 text-sm" htmlFor="core-notifications">
            <Switch defaultChecked id="core-notifications" />
            Beri tahu saat quote siap
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h3>Tabs</h3></CardTitle>
          <CardDescription>Memisahkan ringkasan dan bukti tanpa menambah halaman.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Ringkasan</TabsTrigger>
              <TabsTrigger value="evidence">Bukti</TabsTrigger>
            </TabsList>
            <TabsContent className="pt-3 text-muted-foreground" value="summary">
              Konteks project tampil lebih dulu.
            </TabsContent>
            <TabsContent className="pt-3 text-muted-foreground" value="evidence">
              Bukti pendukung tersedia untuk ditinjau.
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h3>Tooltip</h3></CardTitle>
          <CardDescription>Bantuan singkat muncul saat kontrol perlu konteks tambahan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tooltip>
            <TooltipTrigger render={<Button aria-label="Bantuan status" type="button" variant="outline" />}>
              Arahkan untuk bantuan
            </TooltipTrigger>
            <TooltipContent>Gunakan status server sebagai sumber kebenaran.</TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h3>Anchor CTA</h3></CardTitle>
          <CardDescription>Link yang terlihat seperti CTA tetap membawa navigasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuLink href="#components" size="sm">Lihat core components</AuLink>
        </CardContent>
      </Card>
    </div>
  );
}
