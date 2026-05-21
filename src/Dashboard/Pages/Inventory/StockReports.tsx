import {
  Card,
  Group,
  Title,
  Text,
  Table,
  Badge,
  Button,
  Select,
  Tabs,
  Menu,
  TextInput,
  Pagination,
  Loader,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconDownload,
  IconBox,
  IconSearch,
} from "@tabler/icons-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useState, useMemo } from "react";
import { useBrand } from "../../Context/BrandContext";
import { getHeaderImage } from "../../../utils/assetPaths";
import api from "../../../api_configuration/api";

interface Product {
  _id?: string;
  id?: string;
  code: string;
  productName?: string;
  name?: string;
  productname?: string;
  category: string;
  quantity?: number;
  stock?: number;
  currentStock?: number;
  minimumStockLevel?: number;
  minStock?: number;
  min_stock?: number;
  unitPrice?: number;
  unit_price?: number;
  updatedAt?: string;
  description?: string;
  productDescription?: string;
}

interface LowStockItem {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  lastUpdated: string;
}

interface CategoryReport {
  category: string;
  totalStock: number;
  totalValue: number;
}

export default function StockReports() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [frequency, setFrequency] = useState<"Weekly" | "Monthly">("Weekly");

  // Low Stock tab states
  const [lowSearch, setLowSearch] = useState("");
  const [lowPage, setLowPage] = useState(1);

  // Category tab states
  const [catSearch, setCatSearch] = useState("");
  const [catPage, setCatPage] = useState(1);

  const pageSize = 5;

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await api.get("/products");
        console.log("Products API response:", response.data);
        setProducts(response.data || []);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [frequency]);

  // Calculate low stock items
  const lowStockReports: LowStockItem[] = useMemo(() => {
    return products
      .filter((product) => {
        const currentStock =
          product.quantity || product.stock || product.currentStock || 0;
        const minStock =
          product.minimumStockLevel ||
          product.minStock ||
          product.min_stock ||
          0;
        return currentStock < minStock;
      })
      .map((product) => ({
        id:
          product._id ||
          product.id ||
          `p-${Math.random().toString(36).slice(2, 8)}`,
        productCode: product.code || "",
        productName:
          product.productName || product.name || product.productname || "",
        category: product.category || "",
        stock: product.quantity || product.stock || product.currentStock || 0,
        minStock:
          product.minimumStockLevel ||
          product.minStock ||
          product.min_stock ||
          0,
        unitPrice: product.unitPrice || product.unit_price || 0,
        lastUpdated:
          product.updatedAt?.split("T")[0] ||
          new Date().toISOString().split("T")[0],
      }));
  }, [products]);

  // Calculate category reports
  const categoryReports: CategoryReport[] = useMemo(() => {
    const categoryMap = new Map<
      string,
      { totalStock: number; totalValue: number }
    >();

    products.forEach((product) => {
      const currentStock =
        product.quantity || product.stock || product.currentStock || 0;
      const price = product.unitPrice || product.unit_price || 0;

      const existing = categoryMap.get(product.category) || {
        totalStock: 0,
        totalValue: 0,
      };
      categoryMap.set(product.category, {
        totalStock: existing.totalStock + currentStock,
        totalValue: existing.totalValue + currentStock * price,
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      totalStock: data.totalStock,
      totalValue: data.totalValue,
    }));
  }, [products]);

  const filteredLow = lowStockReports.filter((d) => {
    const searchLower = lowSearch.toLowerCase();
    return (
      (d.productCode &&
        typeof d.productCode === "string" &&
        d.productCode.toLowerCase().includes(searchLower)) ||
      (d.productName &&
        typeof d.productName === "string" &&
        d.productName.toLowerCase().includes(searchLower)) ||
      (d.category &&
        typeof d.category === "string" &&
        d.category.toLowerCase().includes(searchLower))
    );
  });

  const filteredCat = categoryReports.filter((d) => {
    const searchLower = catSearch.toLowerCase();
    return (
      d.category &&
      typeof d.category === "string" &&
      d.category.toLowerCase().includes(searchLower)
    );
  });

  const lowData = filteredLow.slice(
    (lowPage - 1) * pageSize,
    lowPage * pageSize,
  );
  const catData = filteredCat.slice(
    (catPage - 1) * pageSize,
    catPage * pageSize,
  );

  const exportLowStockPDF = () => {
    const { brand } = useBrand();
    const doc = new jsPDF();

    // Add header image
    const headerImg = new window.Image();
    headerImg.src = getHeaderImage(brand);

    headerImg.onload = () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.addImage(headerImg, "JPEG", 0, 0, pageWidth, 25);

      // Add logo
      const logoImg = new window.Image();
      logoImg.src = "/Logo.png";

      logoImg.onload = () => {
        const logoWidth = 40;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoImg, "PNG", logoX, 27, logoWidth, logoHeight);

        // Add title
        doc.setFontSize(16);
        doc.text("Low Stock Alerts Report", pageWidth / 2, 52, {
          align: "center",
        });

        doc.setFontSize(10);
        doc.text(
          `Date: ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          59,
          { align: "center" },
        );

        autoTable(doc, {
          startY: 65,
          head: [
            [
              "Code",
              "Product",
              "Category",
              "Stock",
              "Min Stock",
              "Unit Price",
              "Last Updated",
            ],
          ],
          body: lowStockReports.map((item) => [
            item.productCode,
            item.productName,
            item.category,
            item.stock,
            item.minStock,
            `Rs. ${item.unitPrice.toLocaleString()}`,
            item.lastUpdated,
          ]),
          theme: "grid",
          headStyles: {
            fillColor: [10, 104, 2],
            textColor: 255,
            fontStyle: "bold",
          },
          bodyStyles: {
            fillColor: [241, 252, 240],
            textColor: 0,
          },
        });

        doc.save("low-stock-report.pdf");
      };
    };
  };

  const exportCategoryPDF = () => {
    const { brand } = useBrand();
    const doc = new jsPDF();

    // Add header image
    const headerImg = new window.Image();
    headerImg.src = getHeaderImage(brand);

    headerImg.onload = () => {
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.addImage(headerImg, "JPEG", 0, 0, pageWidth, 25);

      // Add logo
      const logoImg = new window.Image();
      logoImg.src = "/Logo.png";

      logoImg.onload = () => {
        const logoWidth = 40;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(logoImg, "PNG", logoX, 27, logoWidth, logoHeight);

        // Add title
        doc.setFontSize(16);
        doc.text("Category-wise Stock Report", pageWidth / 2, 52, {
          align: "center",
        });

        doc.setFontSize(10);
        doc.text(
          `Date: ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          59,
          { align: "center" },
        );

        autoTable(doc, {
          startY: 65,
          head: [["Category", "Total Stock", "Total Value"]],
          body: categoryReports.map((c) => [
            c.category,
            c.totalStock.toLocaleString(),
            `Rs. ${c.totalValue.toLocaleString()}`,
          ]),
          theme: "grid",
          headStyles: {
            fillColor: [10, 104, 2],
            textColor: 255,
            fontStyle: "bold",
          },
          bodyStyles: {
            fillColor: [241, 252, 240],
            textColor: 0,
          },
        });

        doc.save("category-report.pdf");
      };
    };
  };

  return (
    <div>
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2}>Stock Reports</Title>
          <Text c="dimmed">View stock reports and alerts</Text>
        </div>
        <Group>
          <Select
            data={["Weekly", "Monthly"]}
            value={frequency}
            onChange={(value) => {
              if (value === "Weekly" || value === "Monthly") {
                setFrequency(value);
              }
            }}
            size="sm"
          />

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button leftSection={<IconDownload size={16} />} color="#0A6802">
                Export Reports
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Item onClick={exportLowStockPDF}>
                Low Stock Report
              </Menu.Item>
              <Menu.Item onClick={exportCategoryPDF}>Category Report</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      {loading ? (
        <Card withBorder bg="#F1FCF0" p="xl">
          <Group justify="center">
            <Loader color="#0A6802" size="lg" />
            <Text>Loading stock reports...</Text>
          </Group>
        </Card>
      ) : (
        <Tabs
          defaultValue="lowStock"
          color="#0A6802"
          variant="pills"
          radius="md"
        >
          <Tabs.List
            style={{ border: "1px solid #0A6802", borderRadius: "10px" }}
            w={285}
          >
            <Tabs.Tab value="lowStock">Low Stock Alerts</Tabs.Tab>
            <Tabs.Tab value="category">Category Reports</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="lowStock" pt="md">
            <Card withBorder bg={"#F1FCF0"}>
              <Group mb="sm">
                <IconAlertTriangle color="red" />
                <Title order={4}>Low Stock Alerts</Title>
              </Group>
              <TextInput
                placeholder="Search low stock..."
                leftSection={<IconSearch size={16} />}
                value={lowSearch}
                onChange={(e) => {
                  setLowSearch(e.currentTarget.value);
                  setLowPage(1);
                }}
                mb="sm"
              />
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Product Code</Table.Th>
                    <Table.Th>Product Name</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Current Stock</Table.Th>
                    <Table.Th>Min Stock</Table.Th>
                    <Table.Th>Unit Price</Table.Th>
                    <Table.Th>Last Updated</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {lowData.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7} style={{ textAlign: "center" }}>
                        <Text c="dimmed">No low stock items found</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    lowData.map((row) => (
                      <Table.Tr key={row.id}>
                        <Table.Td>{row.productCode}</Table.Td>
                        <Table.Td>{row.productName}</Table.Td>
                        <Table.Td>
                          <Badge>{row.category}</Badge>
                        </Table.Td>
                        <Table.Td c="red" fw={700}>
                          {row.stock}
                        </Table.Td>
                        <Table.Td>{row.minStock}</Table.Td>
                        <Table.Td>
                          Rs. {row.unitPrice.toLocaleString()}
                        </Table.Td>
                        <Table.Td>{row.lastUpdated}</Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
              <Group justify="center" mt="md">
                <Pagination
                  color="#0A6802"
                  total={Math.ceil(filteredLow.length / pageSize)}
                  value={lowPage}
                  onChange={setLowPage}
                />
              </Group>
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="category" pt="md">
            <Card withBorder bg={"#F1FCF0"}>
              <Group mb="sm">
                <IconBox color="#0A6802" />
                <Title order={4}>Category-wise Stock Report</Title>
              </Group>
              <TextInput
                placeholder="Search categories..."
                leftSection={<IconSearch size={16} />}
                value={catSearch}
                onChange={(e) => {
                  setCatSearch(e.currentTarget.value);
                  setCatPage(1);
                }}
                mb="sm"
              />
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Total Stock</Table.Th>
                    <Table.Th>Total Value</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {catData.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={3} style={{ textAlign: "center" }}>
                        <Text c="dimmed">No categories found</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    catData.map((row) => (
                      <Table.Tr key={row.category}>
                        <Table.Td>
                          <Badge size="lg" color="#0A6802">
                            {row.category}
                          </Badge>
                        </Table.Td>
                        <Table.Td fw={700}>
                          {row.totalStock.toLocaleString()}
                        </Table.Td>
                        <Table.Td c="#0A6802" fw={700}>
                          Rs. {row.totalValue.toLocaleString()}
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
              <Group justify="center" mt="md">
                <Pagination
                  color="#0A6802"
                  total={Math.ceil(filteredCat.length / pageSize)}
                  value={catPage}
                  onChange={setCatPage}
                />
              </Group>
            </Card>
          </Tabs.Panel>
        </Tabs>
      )}
    </div>
  );
}
