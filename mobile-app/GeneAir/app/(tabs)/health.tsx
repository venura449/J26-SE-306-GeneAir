import { StyleSheet, View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getVitals } from '@/config/api';



export default function HealthScreen() {
    const APP_BG = '#F8F9FA';
    const NAVY_TEXT = '#1A2144';
    const CARD_BG = '#FFFFFF';
    const PRIMARY_BLUE = '#4258B8';
    const GRAY_TEXT = '#7A8299';

    const [vitals, setVitals] = useState<{
        heartRate: string | number;
        spo2: string | number;
        temp: string | number;
    }>({
        heartRate: '--',
        spo2: '--',
        temp: '--',
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserVitals = async () => {
            try {
                const data = await getVitals();

                setVitals({
                    heartRate: data.heartRate || '--',
                    spo2: data.spo2 || '--',
                    temp: data.temp || '--',
                });
            } catch (error) {
                console.error("Error fetching vitals: ", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserVitals();
    }, []);

    return (
        <ScrollView style={[styles.container, { backgroundColor: APP_BG }]}>
            <View style={styles.header}>
                <Text style={[styles.titleText, { color: NAVY_TEXT }]}>Health Overview</Text>
            </View>
            <View>
                <Text style={[styles.subTitleText, { color: NAVY_TEXT, paddingHorizontal: 24 }]}>
                    Risk Level
                </Text>

                <View style={[styles.riskLevelContainer, { backgroundColor: CARD_BG }]}>
                    {/* Top Section: Overall Risk Status */}
                    <View style={styles.riskMain}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFF3E0' }]}>
                            <Ionicons name="warning" size={22} color="#FF9800" />
                        </View>
                        <View style={styles.riskTextInfo}>
                            <Text style={[styles.cardTitle, { color: GRAY_TEXT }]}>Current Status</Text>
                            <Text style={[styles.riskLevelValue, { color: '#FF9800' }]}>Moderate Risk</Text>
                        </View>
                    </View>

                    {/* Bottom Section: Risk Factors */}
                    <View style={styles.riskFactors}>
                        <Text style={[styles.triggerText]}>
                            Trigger Factors
                        </Text>
                        <View style={styles.factorBadgeRow}>
                            {/* Example Factor 1 */}
                            <View style={styles.factorBadge}>
                                <Text style={[styles.factorBadgeText, { color: NAVY_TEXT }]}>
                                    High Temperature
                                </Text>
                            </View>
                            {/* Example Factor 2 */}
                            <View style={styles.factorBadge}>
                                <Text style={[styles.factorBadgeText, { color: NAVY_TEXT }]}>
                                    Elevated PM2.5
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.suggestions}>
                        <Text style={[styles.suggestionTitle]}>
                            Suggestions
                        </Text>
                        <Text style={[styles.suggestionText]}>
                            • Consider wearing a mask outdoors and using an air purifier indoors.
                        </Text>
                    </View>
                </View>
            </View>
            <View style={styles.content}>
                <View style={[styles.card, { backgroundColor: CARD_BG }]}>
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: '#FFEAEA' }]}>
                                <Ionicons name="heart" size={22} color="#FF5252" />
                            </View>
                            <Text style={[styles.cardTitle, { color: GRAY_TEXT }]}>Heart Rate</Text>
                        </View>
                        <Text style={[styles.cardValue, { color: NAVY_TEXT }]} >
                            {vitals.heartRate} <Text style={[styles.unit, { color: GRAY_TEXT }]}>bpm</Text>
                        </Text>
                    </View>
                </View>
                <View style={[styles.card, { backgroundColor: CARD_BG }]}>
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: '#e0e8f4' }]}>
                                <Ionicons name="water" size={22} color="#00C4B4" />
                            </View>
                            <Text style={[styles.cardTitle, { color: GRAY_TEXT }]}>SpO2</Text>
                        </View>
                        <Text style={[styles.cardValue, { color: NAVY_TEXT }]}>
                            {vitals.spo2} <Text style={[styles.unit, { color: GRAY_TEXT }]}>%</Text>
                        </Text>
                    </View>
                </View>
                <View style={[styles.card, { backgroundColor: CARD_BG }]}>
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconContainer, { backgroundColor: '#e0e8f4' }]}>
                                <Ionicons name="thermometer" size={22} color="#00C4B4" />
                            </View>
                            <Text style={[styles.cardTitle, { color: GRAY_TEXT }]}>Temp</Text>
                        </View>
                        <Text style={[styles.cardValue, { color: NAVY_TEXT }]}>
                            {vitals.temp} <Text style={[styles.unit, { color: GRAY_TEXT }]}>°C</Text>
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    )

}
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 24,
        backgroundColor: '#F8F9FA',
        elevation: 3,
    },
    titleText: {
        fontSize: 24,
        fontWeight: '600',
        letterSpacing: -0.5,
    },
    subTitleText: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: -0.5,
        marginTop: 14,
    },
    riskLevelContainer: {
        flexDirection: 'column',
        marginHorizontal: 24,
        marginTop: 12,
        marginBottom: 24,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    riskMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    riskTextInfo: {
        marginLeft: 12,
    },
    riskLevelValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    riskFactors: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F5',
        paddingTop: 16,
    },
    factorBadgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    factorBadge: {
        backgroundColor: '#F8F9FA',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    factorBadgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    triggerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF9800',
        marginBottom: 10,
    },
    suggestions: {
        marginTop: 16,
    },
    suggestionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF9800',
        marginBottom: 10,
    },
    suggestionText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#1A2144',
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        width: '47%',
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardContent: {
        flexDirection: 'row',
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    unit: {
        fontSize: 18,
        fontWeight: '500',
    },
});