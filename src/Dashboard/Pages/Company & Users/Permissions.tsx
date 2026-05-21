import {
  Card,
  Text,
  Group,
  SimpleGrid,
  Switch,
  Table,
  Button,
  Select,
  Badge,
} from "@mantine/core";
import { usePermissionContext } from "../../Context/Company & Users/PermissionContext";

export default function PermissionsManagement() {
  const {
    roles,
    selectedRole,
    enabledPermissions,
    setSelectedRole,
    togglePermission,
  } = usePermissionContext();

  const handleSave = () => {
    alert(
      `${selectedRole.name} updated: ${enabledPermissions.length} permissions enabled`
    );
    console.log("Saved data:", { role: selectedRole.name, enabledPermissions });
  };

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Text fw={600} fz="xl">
          Permissions Management
        </Text>
        <Button color="#0A6802" onClick={handleSave}>
          Save Changes
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="lg">
        {roles.map((role) => (
          <Card
            key={role.name}
            shadow="sm"
            p="lg"
            radius="md"
            withBorder
            onClick={() => setSelectedRole(role)}
            style={{
              cursor: "pointer",
              border:
                selectedRole.name === role.name ? "2px solid green" : undefined,
            }}
          >
            <Group justify="space-between" mb="xs">
              <Text fw={600}>{role.name}</Text>
              {role.icon}
            </Group>
            <Text fz="xl" fw={700}>
              {role.users}
            </Text>
            <Text fz="sm" c="dimmed">
              {role.description}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Card shadow="sm" radius="md" withBorder bg="green.0">
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Role Permissions</Text>
          <Select
            value={selectedRole.name}
            onChange={(value) => {
              const role = roles.find((r) => r.name === value);
              if (role) setSelectedRole(role);
            }}
            data={roles.map((r) => r.name)}
            w={200}
          />
        </Group>

        <Badge color="green" mb="md">
          {selectedRole.name} &nbsp; {enabledPermissions.length} of{" "}
          {selectedRole.permissions.length} permissions enabled
        </Badge>

        <Table highlightOnHover withTableBorder withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Permission</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Access</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {selectedRole.permissions.map((perm) => (
              <Table.Tr key={perm.name}>
                <Table.Td>{perm.name}</Table.Td>
                <Table.Td>{perm.description}</Table.Td>
                <Table.Td>
                  <Switch
                    color="#0A6802"
                    checked={enabledPermissions.includes(perm.name)}
                    onChange={() => togglePermission(perm.name)}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </div>
  );
}
