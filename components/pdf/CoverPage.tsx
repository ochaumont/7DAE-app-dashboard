import { Page, Text, View } from "@react-pdf/renderer";
import { styles, colors } from "./styles";
import { PdfAirbusLogo } from "./icons";

type Props = {
  applicationCount: number;
  filtersDescription: string;
};

export default function CoverPage({ applicationCount, filtersDescription }: Props) {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Page size="A4" style={styles.page}>
      {/* Header band with the Airbus logo */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingBottom: 12,
        }}
      >
        <PdfAirbusLogo width={120} />
        <Text style={{ ...styles.small, letterSpacing: 2 }}>ATOM</Text>
      </View>

      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ ...styles.h1, textAlign: "center" }}>Applications</Text>
        <Text style={{ ...styles.h2, marginTop: 4, color: colors.muted }}>
          Catalogue Export
        </Text>

        <View style={{ height: 30 }} />

        <Text style={{ ...styles.body, color: colors.muted }}>{today}</Text>
        <Text style={{ ...styles.h2, marginTop: 12, color: colors.fg }}>
          {applicationCount} Application{applicationCount === 1 ? "" : "s"} included
        </Text>
      </View>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 12,
        }}
      >
        <Text style={styles.h3}>Active Filters</Text>
        <View style={{ marginTop: 6 }}>
          {filtersDescription.split("\n").map((line, i) => (
            <Text key={i} style={styles.body}>
              {line}
            </Text>
          ))}
        </View>
      </View>
    </Page>
  );
}
